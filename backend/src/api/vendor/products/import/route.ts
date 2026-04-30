import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { ulid } from "ulid"
import { detectFormat, ImportFormat } from "../../../../lib/import/index.js"
import { parseFile } from "../../../../lib/import/index.js"
import { setTransaction } from "../../../../lib/import/import-store.js"
import { putObject } from "../../../../lib/minio-client.js"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const file = (req as any).file as
    | { buffer: Buffer; mimetype: string; originalname: string }
    | undefined

  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No file was uploaded")
  }

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context?.actor_id,
    req.scope
  )
  if (!seller) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Seller not found")
  }

  const format: ImportFormat | null = detectFormat(file.mimetype, file.originalname)
  if (!format) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Unsupported file format. Please upload CSV, Excel (.xlsx) or XML."
    )
  }

  // Parse the file
  const parseResult = parseFile(file.buffer, format)

  // Collect unique category names for manual mapping
  const categoryNames = Array.from(
    new Set(
      parseResult.rows
        .map((r) => r.category_name)
        .filter((c): c is string => !!c)
    )
  )

  // Check for SKU conflicts in existing products
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const incomingSkus = parseResult.rows
    .map((r) => r.sku)
    .filter((s): s is string => !!s)

  // SKUs that already exist for THIS seller (update candidates)
  const existingRows: { sku: string; seller_id: string }[] = incomingSkus.length
    ? await knex("product_variant as pv")
        .select("pv.sku", "sp.seller_id")
        .innerJoin(
          "seller_seller_product_product as sp",
          "pv.product_id",
          "sp.product_id"
        )
        .whereIn("pv.sku", incomingSkus)
        .whereNull("pv.deleted_at")
        .whereNull("sp.deleted_at")
    : []

  const ownedSkus = new Set(
    existingRows.filter((r) => r.seller_id === seller.id).map((r) => r.sku)
  )
  const foreignSkus = new Set(
    existingRows.filter((r) => r.seller_id !== seller.id).map((r) => r.sku)
  )

  const skuConflicts: { sku: string; row: number }[] = parseResult.rows
    .filter((r) => r.sku && foreignSkus.has(r.sku))
    .map((r) => ({ sku: r.sku as string, row: r._row }))

  const toCreate = parseResult.rows.filter(
    (r) => !r.sku || !ownedSkus.has(r.sku)
  ).length

  const toUpdate = parseResult.rows.filter(
    (r) => r.sku && ownedSkus.has(r.sku)
  ).length

  // Store parsed rows in MinIO for the confirm step
  const transactionId = ulid()
  const filePath = `imports/temp/${transactionId}.json`
  const rowsJson = Buffer.from(JSON.stringify(parseResult.rows))
  await putObject(filePath, rowsJson, "application/json")

  setTransaction({
    transaction_id: transactionId,
    seller_id: seller.id,
    file_path: filePath,
    format,
    total: parseResult.rows.length,
    to_create: toCreate,
    to_update: toUpdate,
    categories_to_map: categoryNames,
    sku_conflicts: skuConflicts,
    parse_errors: parseResult.errors,
  })

  res.status(200).json({
    transaction_id: transactionId,
    total: parseResult.rows.length,
    to_create: toCreate,
    to_update: toUpdate,
    categories_to_map: categoryNames,
    sku_conflicts: skuConflicts,
    errors: parseResult.errors,
  })
}
