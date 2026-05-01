import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyMessengerUser } from "../lib/messenger"

interface ReviewNotificationCustomerReplyPayload {
  reviewId: string
  customerId: string
  customerName: string
}

/**
 * Handles the "review_notification.customer_reply" event.
 * Notifies the seller when a customer adds a reply in a review thread.
 * Resolves the target seller via QUERY to keep the route handler lean.
 */
export default async function reviewNotificationCustomerReplySubscriber({
  event: { data },
  container,
}: SubscriberArgs<ReviewNotificationCustomerReplyPayload>) {
  const { reviewId, customerId, customerName } = data
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: relations } = await query.graph({
      entity: "seller_review",
      fields: ["seller_id"],
      filters: { review_id: reviewId },
    })

    const sellerId = (relations as any[])?.[0]?.seller_id
    if (!sellerId) return

    notifyMessengerUser({
      targetUserId: sellerId,
      targetUserType: "SELLER",
      senderName: customerName,
      preview: `${customerName} yorumunuza yorum ekledi.`,
      sourceUserId: customerId,
      sourceUserType: "CUSTOMER",
      subject: "Yorum Yanıtı Bildirimi",
      notificationType: "review_notification",
    })
  } catch (err: unknown) {
    console.warn(
      "[review-notification] Could not resolve seller for customer reply notification:",
      (err as Error).message
    )
  }
}

export const config: SubscriberConfig = {
  event: "review_notification.customer_reply",
}
