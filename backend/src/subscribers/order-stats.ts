import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"

/**
 * Handles the "order.placed" event.
 *
 * For each seller linked to the order (multi-vendor safe), performs a
 * thread-safe UPSERT into seller_daily_stats inside a transaction.
 * One seller failing does NOT block the others.
 *
 * Revenue is stored in the actual currency unit (Medusa total / 100).
 */
export default async function orderStatsSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-stats] Missing order id in event data")
    return
  }

  // ── Resolve ALL seller_ids linked to this order (multi-vendor) ─────────────
  const { data: orderLinks } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["seller_id"],
    filters: { order_id: orderId },
  })

  if (!orderLinks?.length) {
    // Not a marketplace order (e.g., admin-created) — nothing to record
    return
  }

  // ── Resolve order details ───────────────────────────────────────────────────
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "total", "created_at"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as { id: string; total: number; created_at: string } | undefined
  if (!order) {
    logger.warn(`[order-stats] Order ${orderId} not found`)
    return
  }

  // Medusa stores monetary values in smallest currency unit (e.g. kuruş).
  // Divide by 100 to get the decimal amount.
  const orderTotal = Number(order.total ?? 0) / 100
  const orderDate = new Date(order.created_at).toISOString().slice(0, 10) // YYYY-MM-DD UTC

  // Unique seller_ids for this order
  const sellerIds = [
    ...new Set(
      orderLinks
        .map((l: any) => l.seller_id as string | undefined)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  // Revenue split equally across sellers in the rare multi-vendor case
  const revenuePerSeller = sellerIds.length > 0 ? orderTotal / sellerIds.length : 0

  // ── UPSERT for each seller inside its own transaction ──────────────────────
  for (const sellerId of sellerIds) {
    try {
      await knex.transaction(async (trx: any) => {
        await trx.raw(
          `INSERT INTO seller_daily_stats (seller_id, date, orders_count, revenue)
           VALUES (?, ?, 1, ?)
           ON CONFLICT (seller_id, date)
           DO UPDATE SET
             orders_count = seller_daily_stats.orders_count + 1,
             revenue      = seller_daily_stats.revenue + EXCLUDED.revenue`,
          [sellerId, orderDate, revenuePerSeller]
        )
      })
    } catch (err: unknown) {
      logger.error(
        `[order-stats] Failed to upsert stats for seller ${sellerId}: ${(err as Error).message}`
      )
      // Continue — one seller failing must not block the rest
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
