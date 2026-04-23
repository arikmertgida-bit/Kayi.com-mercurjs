import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// 5-dakika in-memory cache — her deploy'da sıfırlanır
let cache: { ids: string[]; updatedAt: number } = { ids: [], updatedAt: 0 }
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const now = Date.now()

  if (cache.ids.length > 0 && now - cache.updatedAt < CACHE_TTL_MS) {
    return res.json({ category_ids: cache.ids })
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rows: { id: string }[] = await knex("product_category")
    .select("id")
    .whereRaw("metadata->>'is_adult' = ?", ["true"])
    .whereNull("deleted_at")

  cache = { ids: rows.map((r) => r.id), updatedAt: now }

  return res.json({ category_ids: cache.ids })
}
