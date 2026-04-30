import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { ulid } from "ulid"
import {
  getTransaction,
  deleteTransaction,
  createJob,
  updateJob,
} from "../../../../../lib/import/import-store.js"
import { getObject, putObject, presignedGetUrl, removeObject } from "../../../../../lib/minio-client.js"
import { ImportedProduct } from "../../../../../lib/import/types.js"
import { convertToTry } from "../../../../../lib/import/currency-converter.js"

const BodySchema = z.object({
  transaction_id: z.string().min(1),
  category_mapping: z.array(
    z.object({ name: z.string(), platform_id: z.string() })
  ).optional().default([]),
  currency: z.string().optional(),
})

const CHUNK_SIZE = 50

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.errors.map((e) => e.message).join(", ")
    )
  }
  const { transaction_id, category_mapping } = parsed.data

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context?.actor_id,
    req.scope
  )
  if (!seller) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Seller not found")
  }

  const transaction = getTransaction(transaction_id)
  if (!transaction) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Import session expired or not found. Please upload again."
    )
  }
  if (transaction.seller_id !== seller.id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Access denied")
  }

  const jobId = ulid()
  createJob(jobId, seller.id, transaction_id, transaction.total)

  // Return 202 immediately
  res.status(202).json({ job_id: jobId })

  // Build category lookup: name → platform_id
  const categoryMap = new Map<string, string>(
    (category_mapping ?? []).map((m) => [m.name, m.platform_id])
  )

  // Process asynchronously
  setImmediate(async () => {
    const scope = req.scope
    updateJob(jobId, { status: "running" })

    const rowErrors: { row: number; sku?: string; message: string }[] = []
    const skuChanges: { original: string; generated: string }[] = []

    let created = 0
    let updated = 0
    let skipped = 0
    let processed = 0

    try {
      // Load parsed rows from MinIO
      const rawJson = await getObject(transaction.file_path)
      const rows: ImportedProduct[] = JSON.parse(rawJson.toString("utf-8"))

      // Build short seller ID suffix (last 6 chars of seller.id) for SKU conflict resolution
      const sellerSuffix = seller.id.slice(-6)

      // Process in chunks
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE)

        for (const row of chunk) {
          try {
            // Handle SKU conflicts: rename SKU by appending seller suffix
            let sku = row.sku
            const isConflict = transaction.sku_conflicts.some((c) => c.sku === sku)
            if (sku && isConflict) {
              const newSku = `${sku}-${sellerSuffix}`
              skuChanges.push({ original: sku, generated: newSku })
              sku = newSku
            }

            // Resolve category
            const categoryId = row.category_name
              ? categoryMap.get(row.category_name)
              : undefined

            // Convert price to TRY minor units
            const priceTry = convertToTry(row.price_amount, row.currency)

            // Build product input
            const productInput: any = {
              title: row.title,
              description: row.description,
              status: row.status === "published" ? "proposed" : "draft",
              handle: row.handle,
              weight: row.weight,
              thumbnail: row.thumbnail,
              images: row.images?.length
                ? row.images.map((url) => ({ url }))
                : undefined,
              categories: categoryId ? [{ id: categoryId }] : undefined,
              options: row.option_name
                ? [{ title: row.option_name, values: [row.option_value ?? row.option_name] }]
                : [{ title: "Default", values: ["Default"] }],
              variants: [
                {
                  title: row.variant_title ?? row.option_value ?? "Default",
                  sku,
                  barcode: row.barcode,
                  manage_inventory: row.manage_inventory,
                  allow_backorder: row.allow_backorder,
                  inventory_quantity: row.stock,
                  options: row.option_name
                    ? { [row.option_name]: row.option_value ?? row.option_name }
                    : { Default: "Default" },
                  prices: [
                    {
                      amount: priceTry,
                      currency_code: "try",
                    },
                  ],
                },
              ],
            }

            await createProductsWorkflow.run({
              container: scope,
              input: {
                products: [productInput],
                additional_data: { seller_id: seller.id },
              },
            })

            created++
          } catch (err: any) {
            rowErrors.push({
              row: row._row,
              sku: row.sku,
              message: err?.message ?? String(err),
            })
            skipped++
          }

          processed++
          updateJob(jobId, { processed, created, updated, skipped, errors: rowErrors, sku_changes: skuChanges })
        }
      }

      // Write error log CSV if there are errors
      let errorLogPath: string | undefined
      if (rowErrors.length > 0) {
        const csvLines = ["Row,SKU,Error"]
        for (const e of rowErrors) {
          const safeSku = (e.sku ?? "").replace(/"/g, '""')
          const safeMsg = e.message.replace(/"/g, '""')
          csvLines.push(`${e.row},"${safeSku}","${safeMsg}"`)
        }
        errorLogPath = `imports/errors/${jobId}-errors.csv`
        await putObject(
          errorLogPath,
          Buffer.from(csvLines.join("\n"), "utf-8"),
          "text/csv"
        )
      }

      updateJob(jobId, {
        status: "done",
        processed,
        created,
        updated,
        skipped,
        errors: rowErrors,
        sku_changes: skuChanges,
        error_log_path: errorLogPath,
        finished_at: Date.now(),
      })
    } catch (fatalErr: any) {
      updateJob(jobId, {
        status: "failed",
        errors: [
          ...rowErrors,
          { row: 0, message: `Fatal: ${fatalErr?.message ?? String(fatalErr)}` },
        ],
        finished_at: Date.now(),
      })
    } finally {
      // Cleanup temp file from MinIO
      await removeObject(transaction.file_path)
      deleteTransaction(transaction_id)
    }
  })
}
