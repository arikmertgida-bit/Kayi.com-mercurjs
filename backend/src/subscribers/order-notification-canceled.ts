import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { notifyMessengerUser } from "../lib/messenger"

/**
 * Handles the "order.canceled" event.
 *
 * Notifies both the seller and the customer when an order is cancelled.
 * Both notifications are sent concurrently (Promise.all) to minimise latency.
 */
export default async function orderNotificationCanceledSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-notification-canceled] Missing order id in event data")
    return
  }

  // ── Resolve order + customer ────────────────────────────────────────────────
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "customer_id", "*customer"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as any
  const customerId = order?.customer_id as string | undefined
  const firstName = (order?.customer as any)?.first_name ?? "Müşteri"
  const displayId = order?.display_id ?? orderId

  // ── Resolve seller ─────────────────────────────────────────────────────────
  const { data: orderLinks } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["seller_id"],
    filters: { order_id: orderId },
  })

  const sellerId = orderLinks?.[0]?.seller_id as string | undefined

  let memberId: string | undefined
  if (sellerId) {
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id", "*members"],
      filters: { id: sellerId },
    })
    memberId = ((sellers?.[0] as any)?.members as any[])?.[0]?.id
  }

  // ── Notify both parties concurrently ───────────────────────────────────────
  const notifications: Promise<void>[] = []

  if (customerId) {
    notifications.push(
      notifyMessengerUser({
        targetUserId: customerId,
        targetUserType: "CUSTOMER",
        preview: `#${displayId} numaralı siparişiniz iptal edildi.`,
        notificationType: "order_canceled",
      })
    )
  }

  if (memberId) {
    notifications.push(
      notifyMessengerUser({
        targetUserId: memberId,
        targetUserType: "SELLER",
        preview: `#${displayId} numaralı sipariş iptal edildi.`,
        notificationType: "order_canceled",
      })
    )
  }

  await Promise.allSettled(notifications)
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
