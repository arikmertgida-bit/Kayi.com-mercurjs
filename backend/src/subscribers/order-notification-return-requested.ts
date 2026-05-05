import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { notifyMessengerUser } from "../lib/messenger"

/**
 * Handles the "order.return_requested" event.
 *
 * Notifies the seller when a customer submits a return request so they
 * can review and respond in the vendor panel.
 */
export default async function orderNotificationReturnRequestedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-notification-return-requested] Missing order id in event data")
    return
  }

  // ── Resolve order display_id ───────────────────────────────────────────────
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "customer_id", "*customer"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as any
  const displayId = order?.display_id ?? orderId
  const customerName: string =
    [
      (order?.customer as any)?.first_name,
      (order?.customer as any)?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Müşteri"

  // ── Resolve seller ─────────────────────────────────────────────────────────
  const { data: orderLinks } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["seller_id"],
    filters: { order_id: orderId },
  })

  const sellerId = orderLinks?.[0]?.seller_id as string | undefined
  if (!sellerId) {
    // Return on a non-marketplace order — no action needed
    return
  }

  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "*members"],
    filters: { id: sellerId },
  })

  const memberId = ((sellers?.[0] as any)?.members as any[])?.[0]?.id as string | undefined
  if (!memberId) {
    logger.warn(`[order-notification-return-requested] Seller ${sellerId} has no members — skipping notification`)
    return
  }

  notifyMessengerUser({
    targetUserId: memberId,
    targetUserType: "SELLER",
    preview: `${customerName}, #${displayId} siparişi için iade talebinde bulundu.`,
    notificationType: "order_return_requested",
  }).catch(() => {
    // Non-critical — fire-and-forget
  })
}

export const config: SubscriberConfig = {
  event: "order.return_requested",
}
