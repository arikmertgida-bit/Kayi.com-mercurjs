import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/sellers/:handle/products
 * Returns IDs of published products belonging to this seller.
 * Uses raw knex (same pattern as categories endpoint) to reliably
 * traverse the seller-product link without depending on Meilisearch.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { handle } = req.params

  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "24"), 10)))
  const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10))

  const seller = await knex("seller")
    .select("id")
    .where({ handle, deleted_at: null })
    .first()

  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  const whereClause = {
    "seller_seller_product_product.seller_id": seller.id,
    "seller_seller_product_product.deleted_at": null,
    "product.deleted_at": null,
    "product.status": "published",
  }

  const baseQuery = knex("product").join(
    "seller_seller_product_product",
    "product.id",
    "seller_seller_product_product.product_id"
  )

  const [countResult] = await baseQuery.clone().where(whereClause).count("product.id as count")
  const total = parseInt(String(countResult?.count || 0), 10)

  const productIds: string[] = await baseQuery
    .clone()
    .where(whereClause)
    .orderBy("product.created_at", "desc")
    .offset(offset)
    .limit(limit)
    .pluck("product.id")

  return res.json({
    product_ids: productIds,
    count: total,
    offset,
    limit,
  })
}
