import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { z } from "zod"
import { ulid } from "ulid"
import { createJob } from "../../../../../lib/import/import-store.js"
import { putObject } from "../../../../../lib/minio-client.js"
import { GroupedProduct, GroupedVariant } from "../../../../../lib/import/grouper.js"
import { getImportQueue } from "../../../../../lib/import/queue.js"
import { injectContainer, ensureWorkerStarted } from "../../../../../lib/import/worker.js"

const VariantSchema = z.object({
  option_value: z.string().min(1),
  sku: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0).optional().default(0),
})

const ProductEntrySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type_id: z.string().optional(),
  collection_id: z.string().optional(),
  stock_location_id: z.string().optional(),
  status: z.enum(["draft", "proposed"]).default("proposed"),
  product_type: z.enum(["simple", "variant"]).default("simple"),
  // simple
  sku: z.string().optional(),
  price: z.number().min(0).optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  // variant
  option_name: z.string().optional(),
  variants: z.array(VariantSchema).optional(),
})

const BodySchema = z.object({
  products: z.array(ProductEntrySchema).min(1).max(500),
  stock_location_id: z.string().optional(),
  total_stock: z.number().int().min(0).optional(),
  category_mapping: z
    .array(z.object({ name: z.string(), platform_id: z.string() }))
    .optional()
    .default([]),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.errors.map((e) => e.message).join(", ")
    )
  }
  const { products, stock_location_id, total_stock, category_mapping } = parsed.data

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context?.actor_id,
    req.scope
  )
  if (!seller) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Seller not found")
  }

  // ── Transform JSON entries → GroupedProduct format ─────────────────────────
  const grouped: GroupedProduct[] = products.map((entry, idx) => {
    const isVariant = entry.product_type === "variant" && (entry.variants?.length ?? 0) > 0
    const optionName = isVariant ? (entry.option_name ?? "Variant") : "Default"

    const variants: GroupedVariant[] = isVariant
      ? (entry.variants ?? []).map((v, vi) => ({
          sku: v.sku,
          stock: v.stock ?? 0,
          price_amount: Math.round(v.price * 100),
          currency: "try",
          option_value: v.option_value,
          variant_title: v.option_value,
          allow_backorder: false,
          manage_inventory: true,
          _row: idx * 100 + vi + 1,
        }))
      : [
          {
            sku: entry.sku,
            stock: entry.stock ?? 0,
            price_amount: Math.round((entry.price ?? 0) * 100),
            currency: "try",
            option_value: "Default",
            variant_title: entry.title,
            allow_backorder: false,
            manage_inventory: true,
            _row: idx + 1,
          },
        ]

    return {
      model_code: entry.sku ?? entry.title,
      title: entry.title,
      description: entry.description,
      status: entry.status === "proposed" ? "published" : "draft",
      category_name: undefined,
      thumbnail: entry.thumbnail,
      images: entry.images ?? [],
      option_name: optionName,
      variants,
    } satisfies GroupedProduct
  })

  const totalVariants = grouped.reduce((acc, g) => acc + g.variants.length, 0)

  // ── Save grouped JSON to MinIO ─────────────────────────────────────────────
  const jobId = ulid()
  const groupedPath = `imports/grouped/${jobId}.json`
  await putObject(
    groupedPath,
    Buffer.from(JSON.stringify(grouped), "utf-8"),
    "application/json"
  )

  // ── Inject container & start worker (idempotent) ───────────────────────────
  injectContainer(req.scope)
  ensureWorkerStarted()

  // ── Enqueue BullMQ job ─────────────────────────────────────────────────────
  const sellerSuffix = seller.id.slice(-6)
  await getImportQueue().add("process", {
    job_id: jobId,
    seller_id: seller.id,
    seller_suffix: sellerSuffix,
    minio_path: groupedPath,
    category_mapping: category_mapping ?? [],
    stock_location_id,
    total_stock,
    total_variants: totalVariants,
  })

  const waitingCount = await getImportQueue().getWaitingCount()
  const queuePosition = waitingCount

  createJob(jobId, seller.id, `bulk-${jobId}`, grouped.length, queuePosition)

  res.status(202).json({
    job_id: jobId,
    queue_position: queuePosition,
    total: grouped.length,
    total_variants: totalVariants,
  })
}
