import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { z } from "zod"
import { ulid } from "ulid"
import {
  getTransaction,
  deleteTransaction,
  createJob,
} from "../../../../../lib/import/import-store.js"
import { getObject, putObject, removeObject } from "../../../../../lib/minio-client.js"
import { ImportedProduct } from "../../../../../lib/import/types.js"
import { groupByModelCode } from "../../../../../lib/import/grouper.js"
import { getImportQueue } from "../../../../../lib/import/queue.js"
import { injectContainer, ensureWorkerStarted } from "../../../../../lib/import/worker.js"

const BodySchema = z.object({
  transaction_id: z.string().min(1),
  category_mapping: z.array(
    z.object({ name: z.string(), platform_id: z.string() })
  ).optional().default([]),
  currency: z.string().optional(),
  stock_location_id: z.string().optional(),
  total_stock: z.number().int().min(0).optional(),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.errors.map((e) => e.message).join(", ")
    )
  }
  const { transaction_id, category_mapping, stock_location_id, total_stock } = parsed.data

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

  // ── Load raw rows from MinIO ────────────────────────────────────────────────
  const rawJson = await getObject(transaction.file_path)
  const rows: ImportedProduct[] = JSON.parse(rawJson.toString("utf-8"))

  // ── Group rows by model_code (or title) ────────────────────────────────────
  const grouped = groupByModelCode(rows)
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

  // ── Queue position (waiting count includes our newly added job) ────────────
  const waitingCount = await getImportQueue().getWaitingCount()
  const queuePosition = waitingCount

  // ── Persist job in import-store ────────────────────────────────────────────
  createJob(jobId, seller.id, transaction_id, grouped.length, queuePosition)

  // ── Cleanup temp upload file ───────────────────────────────────────────────
  await removeObject(transaction.file_path).catch(() => {})
  deleteTransaction(transaction_id)

  res.status(202).json({
    job_id: jobId,
    queue_position: queuePosition,
    total: grouped.length,
    total_variants: totalVariants,
  })
}
