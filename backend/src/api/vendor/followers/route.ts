import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /vendor/followers
 * List followers for the current vendor/seller (requires vendor auth)
 * Shows: customer name, order count, follow date
 * Query: limit (default 20), offset, q (search by name)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Resolve seller from auth context (actor_id is the seller member id)
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { data: [seller] } = await query.graph({
    entity: "seller",
    filters: { members: { id: actorId } },
    fields: ["id"],
  })

  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  const sellerId = seller.id
  const q = (req.query.q as string | undefined)
  const skip = parseInt(String(req.query.offset || 0), 10)
  const take = parseInt(String(req.query.limit || 20), 10)

  let baseQuery = knex("seller_follower")
    .join("customer", "customer.id", "seller_follower.customer_id")
    .where({ "seller_follower.seller_id": sellerId })
    .whereRaw("(customer.deleted_at IS NULL)")

  if (q && q.length >= 2) {
    const sanitized = `%${q.replace(/[%_\\]/g, "\\$&")}%`
    baseQuery = baseQuery.where((builder: any) => {
      builder
        .whereRaw("customer.first_name ILIKE ?", [sanitized])
        .orWhereRaw("customer.last_name ILIKE ?", [sanitized])
        .orWhereRaw("customer.email ILIKE ?", [sanitized])
    })
  }

  const [countRow] = await baseQuery.clone().count("seller_follower.id as count")
  const total = parseInt(String(countRow?.count || 0), 10)

  // Get followers with order count
  const rows = await baseQuery
    .clone()
    .select(
      "customer.id as customer_id",
      "customer.first_name",
      "customer.last_name",
      "customer.email",
      "seller_follower.created_at as followed_at"
    )
    .orderBy("seller_follower.created_at", "desc")
    .limit(take)
    .offset(skip)

  // Enrich with order counts per customer
  const customerIds = rows.map((r: any) => r.customer_id)

  let orderCounts: Record<string, number> = {}
  if (customerIds.length > 0) {
    const orderRows = await knex("order")
      .select("customer_id")
      .count("id as order_count")
      .whereIn("customer_id", customerIds)
      .whereNull("deleted_at")
      .groupBy("customer_id")

    orderRows.forEach((row: any) => {
      orderCounts[row.customer_id] = parseInt(String(row.order_count), 10)
    })
  }

  const followers = rows.map((row: any) => ({
    customer_id: row.customer_id,
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
    email: row.email,
    order_count: orderCounts[row.customer_id] || 0,
    followed_at: row.followed_at,
  }))

  return res.json({
    followers,
    count: total,
    offset: skip,
    limit: take,
  })
}
