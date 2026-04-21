import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/sellers/following
 * List sellers followed by the current customer (requires auth)
 * Query: limit (default 20), offset (default 0)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0

  const rows = await knex("seller_follower")
    .join("seller", "seller.id", "seller_follower.seller_id")
    .where({ "seller_follower.customer_id": customerId, "seller.deleted_at": null })
    .select(
      "seller.id",
      "seller.name",
      "seller.handle",
      "seller.photo",
      "seller_follower.created_at as followed_at"
    )
    .orderBy("seller_follower.created_at", "desc")
    .limit(limit)
    .offset(offset)

  const [countRow] = await knex("seller_follower")
    .join("seller", "seller.id", "seller_follower.seller_id")
    .where({ "seller_follower.customer_id": customerId, "seller.deleted_at": null })
    .count("seller_follower.id as count")

  const total = parseInt(String(countRow?.count || 0), 10)

  return res.json({
    sellers: rows,
    count: total,
    limit,
    offset,
  })
}
