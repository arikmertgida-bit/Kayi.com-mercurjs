import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/sellers/following
 * List sellers followed by the current customer (requires auth)
 * Query: limit (default 20), offset (default 0)
 *
 * Architecture note:
 * `seller_follower` is a custom table (not a Medusa module entity) — Knex is
 * used exclusively to query it and to fetch `followed_at` timestamps which are
 * not available via query.graph.
 * All Medusa-managed data (seller + members with soft-delete awareness) is
 * fetched via query.graph, which respects ORM-level soft deletes and avoids
 * raw SQL joins against Medusa-managed tables.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0

  // Step 1: Use Knex only for the custom seller_follower table.
  // Fetches seller_id + followed_at for this customer, paginated.
  const followerRows = await knex("seller_follower")
    .where({ customer_id: customerId })
    .select("seller_id", "created_at as followed_at")
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset)

  const [countRow] = await knex("seller_follower")
    .where({ customer_id: customerId })
    .count("id as count")

  const total = parseInt(String(countRow?.count ?? 0), 10)

  if (followerRows.length === 0) {
    return res.json({ sellers: [], count: total, limit, offset })
  }

  const sellerIds = followerRows.map((r: { seller_id: string }) => r.seller_id)

  // Step 2: Fetch sellers + members via query.graph (respects soft deletes,
  // no raw SQL against Medusa-managed tables).
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: [
      "id",
      "name",
      "handle",
      "photo",
      "deleted_at",
      "members.id",
      "members.name",
      "members.photo",
      "members.role",
      "members.deleted_at",
    ],
    filters: { id: sellerIds },
  })

  // Step 3: Build response — merge followed_at from Knex, resolve owner member
  // in application layer, preserve original sort order from follower table.
  const followedAtMap = new Map<string, string>(
    followerRows.map((r: { seller_id: string; followed_at: string }) => [
      r.seller_id,
      r.followed_at,
    ])
  )

  const result = sellerIds
    .map((sellerId: string) => {
      const seller = (sellers as any[]).find((s) => s.id === sellerId)
      if (!seller || seller.deleted_at) return null

      const activeMembers: Array<{ id: string; name: string; photo?: string | null; role: string; deleted_at?: string | null }> =
        (seller.members ?? []).filter(
          (m: { deleted_at?: string | null }) => !m.deleted_at
        )

      const ownerMember =
        activeMembers.find((m) => m.role === "owner") ??
        activeMembers.find((m) => m.role === "admin") ??
        activeMembers[0] ??
        null

      return {
        id: seller.id,
        name: seller.name,
        handle: seller.handle,
        photo: seller.photo ?? null,
        followed_at: followedAtMap.get(sellerId) ?? null,
        member_photo: ownerMember?.photo ?? null,
      }
    })
    .filter(Boolean)

  return res.json({
    sellers: result,
    count: total,
    limit,
    offset,
  })
}
