import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

async function ensureFollowerTable(knex: any) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS seller_follower (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id VARCHAR NOT NULL,
      customer_id VARCHAR NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(seller_id, customer_id)
    )
  `)
}

async function getSellerByHandle(knex: any, handle: string) {
  const rows = await knex("seller")
    .select("id", "name", "photo")
    .where({ handle, deleted_at: null })
    .limit(1)
  return rows[0] || null
}

/**
 * GET /store/sellers/:handle/follow
 * Check if current customer follows this seller
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { handle } = req.params

  const customerId = (req as any).auth_context?.actor_id

  const seller = await getSellerByHandle(knex, handle)
  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  await ensureFollowerTable(knex)

  const [countRow] = await knex("seller_follower")
    .where({ seller_id: seller.id })
    .count("id as count")

  const followersCount = parseInt(String(countRow?.count || 0), 10)

  if (!customerId) {
    return res.json({ following: false, followers_count: followersCount })
  }

  const existing = await knex("seller_follower")
    .where({ seller_id: seller.id, customer_id: customerId })
    .first()

  return res.json({
    following: Boolean(existing),
    followers_count: followersCount,
  })
}

/**
 * POST /store/sellers/:handle/follow
 * Follow a seller (requires auth)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { handle } = req.params

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const seller = await getSellerByHandle(knex, handle)
  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  await ensureFollowerTable(knex)

  await knex("seller_follower")
    .insert({ seller_id: seller.id, customer_id: customerId })
    .onConflict(["seller_id", "customer_id"])
    .ignore()

  const [countRow] = await knex("seller_follower")
    .where({ seller_id: seller.id })
    .count("id as count")

  return res.json({
    following: true,
    followers_count: parseInt(String(countRow?.count || 0), 10),
  })
}

/**
 * DELETE /store/sellers/:handle/follow
 * Unfollow a seller (requires auth)
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { handle } = req.params

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const seller = await getSellerByHandle(knex, handle)
  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  await ensureFollowerTable(knex)

  await knex("seller_follower")
    .where({ seller_id: seller.id, customer_id: customerId })
    .delete()

  const [countRow] = await knex("seller_follower")
    .where({ seller_id: seller.id })
    .count("id as count")

  return res.json({
    following: false,
    followers_count: parseInt(String(countRow?.count || 0), 10),
  })
}
