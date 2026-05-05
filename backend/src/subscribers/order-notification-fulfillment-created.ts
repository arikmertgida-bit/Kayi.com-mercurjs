import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyMessengerUser } from "../lib/messenger"

/**
 * Handles the "order.fulfillment_created" event.
 *
 * Notifies the customer in real-time when their order has been shipped.
 * The notification appears inside the storefront's notification area.
 */
export default async function orderNotificationFulfillmentCreatedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-notification-fulfillment-created] Missing order id in event data")
    return
  }

  // ── Resolve order + customer ────────────────────────────────────────────────
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "customer_id", "*customer"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as any
  if (!order?.customer_id) {
    logger.warn(`[order-notification-fulfillment-created] Order ${orderId} has no customer — skipping notification`)
    return
  }

  const customerId = order.customer_id as string
  const firstName = (order.customer as any)?.first_name ?? "Müşteri"
  const displayId = order?.display_id ?? orderId

  notifyMessengerUser({
    targetUserId: customerId,
    targetUserType: "CUSTOMER",
    preview: `Merhaba ${firstName}! #${displayId} numaralı siparişiniz kargoya verildi.`,
    notificationType: "order_shipped",
  }).catch(() => {
    // Non-critical — fire-and-forget
  })
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
