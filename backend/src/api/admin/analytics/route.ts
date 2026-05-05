import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/analytics
 *
 * Returns daily order + customer counts for the given date range,
 * plus platform-wide totals for products and active sellers.
 *
 * Query params:
 *   from  – start date, "YYYY-MM-DD"  (default: 7 days ago)
 *   to    – end date,   "YYYY-MM-DD"  (default: today)
 *
 * Results are meant to be cached on the client for 24 hours so the
 * endpoint is called at most once per day, keeping backend load minimal.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Default: last 7 days
  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 7)

  const from =
    (req.query.from as string) ||
    defaultFrom.toISOString().slice(0, 10)
  const to =
    (req.query.to as string) ||
    now.toISOString().slice(0, 10)

  const fromTs = `${from}T00:00:00.000Z`
  const toTs = `${to}T23:59:59.999Z`

  // Run all queries in parallel for performance
  const [
    ordersByDayResult,
    customersByDayResult,
    productsResult,
    activeSellersResult,
    totalOrdersResult,
    totalCustomersResult,
  ] = await Promise.all([
    // Daily order counts in date range
    knex.raw(
      `SELECT DATE("created_at" AT TIME ZONE 'UTC') AS date, COUNT(*)::int AS count
       FROM "order"
       WHERE "created_at" >= ? AND "created_at" <= ? AND "deleted_at" IS NULL
       GROUP BY DATE("created_at" AT TIME ZONE 'UTC')
       ORDER BY date ASC`,
      [fromTs, toTs]
    ),

    // Daily new-customer counts in date range
    knex.raw(
      `SELECT DATE("created_at" AT TIME ZONE 'UTC') AS date, COUNT(*)::int AS count
       FROM "customer"
       WHERE "created_at" >= ? AND "created_at" <= ? AND "deleted_at" IS NULL
       GROUP BY DATE("created_at" AT TIME ZONE 'UTC')
       ORDER BY date ASC`,
      [fromTs, toTs]
    ),

    // Total published products across the platform
    knex.raw(
      `SELECT COUNT(*)::int AS count
       FROM "product"
       WHERE "status" = 'published' AND "deleted_at" IS NULL`
    ),

    // Sellers with at least one published product
    knex.raw(
      `SELECT COUNT(DISTINCT s."seller_id")::int AS count
       FROM "seller_seller_product_product" s
       INNER JOIN "product" p ON s."product_id" = p."id"
       WHERE p."status" = 'published'
         AND p."deleted_at" IS NULL
         AND s."deleted_at" IS NULL`
    ),

    // Total orders (all time)
    knex.raw(
      `SELECT COUNT(*)::int AS count FROM "order" WHERE "deleted_at" IS NULL`
    ),

    // Total customers (all time)
    knex.raw(
      `SELECT COUNT(*)::int AS count FROM "customer" WHERE "deleted_at" IS NULL`
    ),
  ])

  res.json({
    orders_by_day: ordersByDayResult.rows.map((r: any) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      count: Number(r.count),
    })),
    customers_by_day: customersByDayResult.rows.map((r: any) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      count: Number(r.count),
    })),
    total_products: Number(productsResult.rows[0]?.count ?? 0),
    active_sellers: Number(activeSellersResult.rows[0]?.count ?? 0),
    total_orders: Number(totalOrdersResult.rows[0]?.count ?? 0),
    total_customers: Number(totalCustomersResult.rows[0]?.count ?? 0),
  })
}
