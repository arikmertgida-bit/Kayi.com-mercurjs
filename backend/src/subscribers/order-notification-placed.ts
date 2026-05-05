import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { notifyMessengerUser } from "../lib/messenger"

/**
 * Handles the "order.placed" event.
 *
 * Notifies the seller in real-time when a new order arrives.
 * The seller's first active member receives the notification so it appears
 * inside the vendor panel's notification bell immediately.
 */
export default async function orderNotificationPlacedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-notification-placed] Missing order id in event data")
    return
  }

  // ── Resolve seller for this order ──────────────────────────────────────────
  const { data: orderLinks } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["seller_id"],
    filters: { order_id: orderId },
  })

  const sellerId = orderLinks?.[0]?.seller_id as string | undefined
  if (!sellerId) {
    // Order may not be linked to a marketplace seller (e.g., admin-created order)
    return
  }

  // Get seller's first member to deliver the notification to the vendor panel
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name", "*members"],
    filters: { id: sellerId },
  })

  const seller = sellers?.[0] as any
  const memberId = (seller?.members as any[])?.[0]?.id as string | undefined

  if (!memberId) {
    logger.warn(`[order-notification-placed] Seller ${sellerId} has no members — skipping notification`)
    return
  }

  // ── Resolve order display_id for the notification text ─────────────────────
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "currency_code", "total"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as any
  const displayId = order?.display_id ?? orderId

  notifyMessengerUser({
    targetUserId: memberId,
    targetUserType: "SELLER",
    preview: `Yeni sipariş #${displayId} alındı! Lütfen hazırlamaya başlayın.`,
    notificationType: "order_placed",
  }).catch(() => {
    // Non-critical — fire-and-forget
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
