/**
 * BullMQ Worker: Product Import Processor
 *
 * Design:
 * - Concurrency: 3 — 3 import jobs run in parallel
 * - Partial failure: if a variant fails, it is logged and skipped;
 *   successfully imported variants are kept → user sees "98/100 imported, 2 errors"
 * - Upsert: checks seller's existing SKU/barcode before creating
 * - Container injection: injected from the route handler on first import request.
 *   If container is not available (e.g. right after a cold restart before any
 *   request), the job throws and BullMQ marks it as failed after 1 attempt.
 *   The route handler re-injects the container on the next request, at which
 *   point any remaining queued jobs will be picked up normally.
 */
import { Worker, Job } from "bullmq"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getObject, putObject } from "../minio-client.js"
import { GroupedProduct, GroupedVariant } from "./grouper.js"
import { updateJob } from "./import-store.js"
import { convertToTry } from "./currency-converter.js"
import { IMPORT_QUEUE_NAME, ImportWorkerJobData, redisOpts } from "./queue.js"

// ── Container registry ────────────────────────────────────────────────────────

let _container: any = null

/**
 * Called by route handlers before enqueuing jobs.
 * Injects the Medusa DI container so the worker can resolve services.
 */
export function injectContainer(container: any): void {
  _container = container
}

// ── Worker singleton ──────────────────────────────────────────────────────────

let _worker: Worker<ImportWorkerJobData> | null = null

export function ensureWorkerStarted(): void {
  if (_worker) return

  _worker = new Worker<ImportWorkerJobData>(
    IMPORT_QUEUE_NAME,
    async (job: Job<ImportWorkerJobData>) => {
      if (!_container) {
        throw new Error(
          "Medusa container not yet initialized. The job will be retried on next import request."
        )
      }
      await processImportJob(job.data, _container)
    },
    {
      connection: redisOpts,
      concurrency: 3,
    }
  )

  _worker.on("failed", (job, err) => {
    console.error("[ImportWorker] Job failed:", job?.data?.job_id, err.message)
    if (job) {
      updateJob(job.data.job_id, {
        status: "failed",
        errors: [{ row: 0, message: `Worker hatası: ${err.message}` }],
        finished_at: Date.now(),
      })
    }
  })

  _worker.on("error", (err) => {
    console.error("[ImportWorker] Unhandled worker error:", err.message)
  })
}

// ── Core processing logic ─────────────────────────────────────────────────────

async function processImportJob(
  data: ImportWorkerJobData,
  container: any
): Promise<void> {
  const {
    job_id,
    seller_id,
    seller_suffix,
    minio_path,
    category_mapping,
    stock_location_id,
    total_stock,
  } = data

  updateJob(job_id, { status: "running" })

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const categoryMap = new Map<string, string>(
    (category_mapping ?? []).map((m) => [m.name, m.platform_id])
  )

  // Fetch defaults once — used for every created product
  // In Medusa v2 the default sales channel is stored in the store table
  const storeRow = await knex("store")
    .select("default_sales_channel_id")
    .whereNull("deleted_at")
    .first()
  const defaultSalesChannelId: string | undefined = storeRow?.default_sales_channel_id
  const defaultShippingProfile = await knex("shipping_profile")
    .select("id")
    .where({ type: "default" })
    .whereNull("deleted_at")
    .first()

  // Load grouped products from MinIO
  const rawJson = await getObject(minio_path)
  const groups: GroupedProduct[] = JSON.parse(rawJson.toString("utf-8"))

  const rowErrors: { row: number; sku?: string; message: string }[] = []
  const skuChanges: { original: string; generated: string }[] = []
  let created = 0
  let updated = 0
  let processed = 0

  // Total = sum of all variants across all groups
  const total = groups.reduce((acc, g) => acc + g.variants.length, 0)
  updateJob(job_id, { total })

  for (const group of groups) {
    const categoryId = group.category_name
      ? categoryMap.get(group.category_name)
      : undefined

    // ── Find if this seller already owns a product with this model_code ──
    // We search all variants by SKU or barcode
    let existingProductId: string | undefined

    const allSkus = group.variants.map((v) => v.sku).filter(Boolean) as string[]
    const allBarcodes = group.variants.map((v) => v.barcode).filter(Boolean) as string[]

    if (allSkus.length > 0 || allBarcodes.length > 0) {
      const rows: { product_id: string }[] = await knex("product_variant as pv")
        .select("pv.product_id")
        .innerJoin(
          "seller_seller_product_product as ssp",
          "pv.product_id",
          "ssp.product_id"
        )
        .where("ssp.seller_id", seller_id)
        .whereNull("pv.deleted_at")
        .whereNull("ssp.deleted_at")
        .where((qb: any) => {
          if (allSkus.length) qb.orWhereIn("pv.sku", allSkus)
          if (allBarcodes.length) qb.orWhereIn("pv.barcode", allBarcodes)
        })
        .limit(1)

      if (rows.length > 0) {
        existingProductId = rows[0].product_id
      }
    }

    if (existingProductId) {
      // ── UPDATE PATH: seller already has this product ──
      await processUpdateGroup(
        group,
        existingProductId,
        seller_id,
        seller_suffix,
        categoryId,
        stock_location_id,
        total_stock,
        knex,
        container,
        rowErrors,
        skuChanges,
        (delta) => {
          updated += delta
        },
        () => {
          processed++
          updateJob(job_id, {
            processed,
            created,
            updated,
            errors: rowErrors,
            sku_changes: skuChanges,
          })
        }
      )
    } else {
      // ── CREATE PATH: new product ──
      await processCreateGroup(
        group,
        seller_id,
        seller_suffix,
        categoryId,
        defaultSalesChannelId,
        defaultShippingProfile?.id,
        stock_location_id,
        total_stock,
        knex,
        container,
        rowErrors,
        skuChanges,
        () => {
          created++
          processed += group.variants.length
          updateJob(job_id, {
            processed,
            created,
            updated,
            errors: rowErrors,
            sku_changes: skuChanges,
          })
        },
        (variantErrors) => {
          for (const e of variantErrors) rowErrors.push(e)
          processed += group.variants.length
          updateJob(job_id, {
            processed,
            created,
            updated,
            errors: rowErrors,
          })
        }
      )
    }
  }

  // Write error log CSV to MinIO if there were any errors
  let errorLogPath: string | undefined
  if (rowErrors.length > 0) {
    const csvLines = ["Row,SKU,Error"]
    for (const e of rowErrors) {
      const safeSku = (e.sku ?? "").replace(/"/g, '""')
      const safeMsg = e.message.replace(/"/g, '""')
      csvLines.push(`${e.row},"${safeSku}","${safeMsg}"`)
    }
    errorLogPath = `imports/errors/${job_id}-errors.csv`
    await putObject(
      errorLogPath,
      Buffer.from(csvLines.join("\n"), "utf-8"),
      "text/csv"
    )
  }

  updateJob(job_id, {
    status: "done",
    processed,
    created,
    updated,
    skipped: rowErrors.length,
    errors: rowErrors,
    sku_changes: skuChanges,
    error_log_path: errorLogPath,
    finished_at: Date.now(),
  })
}

// ── Update an existing product ────────────────────────────────────────────────

async function processUpdateGroup(
  group: GroupedProduct,
  existingProductId: string,
  seller_id: string,
  seller_suffix: string,
  categoryId: string | undefined,
  stock_location_id: string | undefined,
  total_stock: number | undefined,
  knex: any,
  container: any,
  rowErrors: { row: number; sku?: string; message: string }[],
  skuChanges: { original: string; generated: string }[],
  onUpdated: (delta: number) => void,
  onProcessed: () => void
): Promise<void> {
  for (const variant of group.variants) {
    try {
      // Find existing variant on this product by SKU or barcode
      const existingVariantRows: { id: string }[] = await knex("product_variant")
        .select("id")
        .where("product_id", existingProductId)
        .whereNull("deleted_at")
        .where((qb: any) => {
          if (variant.sku) qb.orWhere("sku", variant.sku)
          if (variant.barcode) qb.orWhere("barcode", variant.barcode)
        })

      const priceTry = convertToTry(variant.price_amount, variant.currency)
      const effectiveStock =
        total_stock !== undefined ? total_stock : variant.stock

      if (existingVariantRows.length > 0) {
        // Update variant price
        const variantId = existingVariantRows[0].id
        await updateProductsWorkflow.run({
          container,
          input: {
            products: [
              {
                id: existingProductId,
                variants: [
                  {
                    id: variantId,
                    prices: [{ amount: priceTry, currency_code: "try" }],
                  },
                ],
              },
            ],
          },
        })

        // Update inventory level
        if (stock_location_id) {
          const invRows: { id: string }[] = await knex("inventory_item as ii")
            .select("ii.id")
            .innerJoin(
              "product_variant_inventory_item as pvii",
              "ii.id",
              "pvii.inventory_item_id"
            )
            .where("pvii.variant_id", variantId)
            .whereNull("ii.deleted_at")

          if (invRows.length > 0) {
            const existingLevel = await knex("inventory_level")
              .where({
                inventory_item_id: invRows[0].id,
                location_id: stock_location_id,
              })
              .whereNull("deleted_at")
              .first()

            if (existingLevel) {
              await updateInventoryLevelsWorkflow.run({
                container,
                input: {
                  updates: [
                    {
                      inventory_item_id: invRows[0].id,
                      location_id: stock_location_id,
                      stocked_quantity: effectiveStock,
                    },
                  ],
                },
              })
            } else {
              await createInventoryLevelsWorkflow.run({
                container,
                input: {
                  inventory_levels: [
                    {
                      inventory_item_id: invRows[0].id,
                      location_id: stock_location_id,
                      stocked_quantity: effectiveStock,
                    },
                  ],
                },
              })
            }
          }
        }

        onUpdated(1)
      } else {
        // Variant not found on this product — log warning and skip
        rowErrors.push({
          row: variant._row,
          sku: variant.sku,
          message: `Ürün (${existingProductId}) için varyant (${variant.sku ?? variant.barcode}) bulunamadı. Manuel inceleme gerekli.`,
        })
      }
    } catch (err: any) {
      rowErrors.push({
        row: variant._row,
        sku: variant.sku,
        message: err?.message ?? String(err),
      })
    }
    onProcessed()
  }
}

// ── Create a new product with all variants ────────────────────────────────────

async function processCreateGroup(
  group: GroupedProduct,
  seller_id: string,
  seller_suffix: string,
  categoryId: string | undefined,
  salesChannelId: string | undefined,
  shippingProfileId: string | undefined,
  stock_location_id: string | undefined,
  total_stock: number | undefined,
  knex: any,
  container: any,
  rowErrors: { row: number; sku?: string; message: string }[],
  skuChanges: { original: string; generated: string }[],
  onCreated: () => void,
  onError: (errors: { row: number; sku?: string; message: string }[]) => void
): Promise<void> {
  try {
    const isMultiVariant = group.variants.length > 1
    const optionName =
      group.option_name || (isMultiVariant ? "Variant" : "Default")

    const productVariants = group.variants.map((variant, vi) => {
      let sku = variant.sku
      // No SKU conflict suffix needed here — upsert check already determined
      // this is a brand new product for this seller.

      const priceTry = convertToTry(variant.price_amount, variant.currency)
      const effectiveStock =
        total_stock !== undefined ? total_stock : variant.stock
      const optionValue = isMultiVariant
        ? variant.option_value || variant.variant_title || sku || `Variant ${vi + 1}`
        : "Default"

      return {
        title: isMultiVariant
          ? optionValue
          : variant.variant_title || group.title,
        sku,
        barcode: variant.barcode,
        manage_inventory: variant.manage_inventory,
        allow_backorder: variant.allow_backorder,
        inventory_quantity: effectiveStock,
        options: { [optionName]: optionValue },
        prices: [{ amount: priceTry, currency_code: "try" }],
      }
    })

    const optionValues = productVariants.map((v) => v.options[optionName])

    const productInput: any = {
      title: group.title,
      description: group.description,
      status: "draft",
      handle: group.handle,
      weight: group.weight,
      thumbnail: group.thumbnail,
      images: group.images?.length
        ? group.images.map((url) => ({ url }))
        : undefined,
      categories: categoryId ? [{ id: categoryId }] : undefined,
      shipping_profile_id: shippingProfileId,
      sales_channels: salesChannelId ? [{ id: salesChannelId }] : undefined,
      options: [{ title: optionName, values: optionValues }],
      variants: productVariants,
    }

    // Remove undefined fields
    Object.keys(productInput).forEach((k) => {
      if (productInput[k] === undefined) delete productInput[k]
    })

    const { result: createResult } = await createProductsWorkflow.run({
      container,
      input: {
        products: [productInput],
        additional_data: { seller_id },
      },
    })

    // Create inventory levels for each variant
    if (stock_location_id) {
      const createdProduct =
        (createResult as any)[0] ?? (createResult as any)?.products?.[0]
      const createdVariants: any[] = createdProduct?.variants ?? []

      for (let vi = 0; vi < createdVariants.length; vi++) {
        const createdVariant = createdVariants[vi]
        const originalVariant = group.variants[vi]
        const effectiveStock =
          total_stock !== undefined
            ? total_stock
            : (originalVariant?.stock ?? 0)

        if (!createdVariant?.id || effectiveStock <= 0) continue

        const invRows: { id: string }[] = await knex("inventory_item as ii")
          .select("ii.id")
          .innerJoin(
            "product_variant_inventory_item as pvii",
            "ii.id",
            "pvii.inventory_item_id"
          )
          .where("pvii.variant_id", createdVariant.id)
          .whereNull("ii.deleted_at")

        if (invRows.length > 0) {
          await createInventoryLevelsWorkflow.run({
            container,
            input: {
              inventory_levels: [
                {
                  inventory_item_id: invRows[0].id,
                  location_id: stock_location_id,
                  stocked_quantity: effectiveStock,
                },
              ],
            },
          })
        }
      }
    }

    onCreated()
  } catch (err: any) {
    onError(
      group.variants.map((v) => ({
        row: v._row,
        sku: v.sku,
        message: err?.message ?? String(err),
      }))
    )
  }
}
