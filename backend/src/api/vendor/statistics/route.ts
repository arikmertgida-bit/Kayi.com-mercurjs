import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

/**
 * GET /vendor/statistics?time_from=YYYY-MM-DDT00:00:00Z&time_to=YYYY-MM-DDT23:59:59Z
 *
 * Returns daily analytics for the authenticated seller:
 *   - orders: from pre-aggregated seller_daily_stats table (fast, O(1))
 *   - customers: unique customers per day from order table (targeted, index-filtered)
 *
 * Default range: last 7 days.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  // ── Parse date range ────────────────────────────────────────────────────────
  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 7)

  const timeFrom =
    (req.query.time_from as string) ||
    `${defaultFrom.toISOString().slice(0, 10)}T00:00:00Z`
  const timeTo =
    (req.query.time_to as string) ||
    `${now.toISOString().slice(0, 10)}T23:59:59Z`

  // DATE-only strings for the seller_daily_stats column (type: DATE)
  const fromDate = timeFrom.slice(0, 10)
  const toDate = timeTo.slice(0, 10)

  // ── Get all order_ids for this seller (needed for customer query) ───────────
  const { data: orderLinks } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["order_id"],
    filters: { seller_id: seller.id },
  })

  const orderIds = orderLinks
    .map((l: any) => l.order_id as string | undefined)
    .filter((id): id is string => Boolean(id))

  // ── Run both queries in parallel ────────────────────────────────────────────
  const [ordersResult, customersResult] = await Promise.all([
    // Orders — pre-aggregated, millisecond response
    knex.raw(
      `SELECT date::text AS date,
              orders_count AS count,
              revenue
       FROM seller_daily_stats
       WHERE seller_id = ?
         AND date >= ?
         AND date <= ?
       ORDER BY date ASC`,
      [seller.id, fromDate, toDate]
    ),

    // Customers — live but scoped to this seller's order_ids only
    orderIds.length > 0
      ? knex.raw(
          `SELECT DATE(created_at AT TIME ZONE 'UTC')::text AS date,
                  COUNT(DISTINCT customer_id)::int AS count
           FROM "order"
           WHERE id = ANY(?)
             AND customer_id IS NOT NULL
             AND created_at >= ?
             AND created_at <= ?
             AND deleted_at IS NULL
           GROUP BY DATE(created_at AT TIME ZONE 'UTC')
           ORDER BY date ASC`,
          [orderIds, timeFrom, timeTo]
        )
      : Promise.resolve({ rows: [] }),
  ])

  res.json({
    orders: ordersResult.rows.map((r: any) => ({
      date: String(r.date),
      count: Number(r.count),
      revenue: Number(r.revenue),
    })),
    customers: customersResult.rows.map((r: any) => ({
      date: String(r.date),
      count: Number(r.count),
    })),
  })
}
