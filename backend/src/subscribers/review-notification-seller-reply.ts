import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyMessengerUser } from "../lib/messenger"

interface ReviewNotificationSellerReplyPayload {
  reviewId: string
  sellerId: string
  sellerName: string
}

/**
 * Handles the "review_notification.seller_reply" event.
 * Notifies the customer when a seller posts a reply to their review.
 * Resolves the target customer via QUERY to keep the route handler lean.
 */
export default async function reviewNotificationSellerReplySubscriber({
  event: { data },
  container,
}: SubscriberArgs<ReviewNotificationSellerReplyPayload>) {
  const { reviewId, sellerId, sellerName } = data
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: relations } = await query.graph({
      entity: "customer_review",
      fields: ["customer_id"],
      filters: { review_id: reviewId },
    })

    const customerId = (relations as any[])?.[0]?.customer_id
    if (!customerId) return

    notifyMessengerUser({
      targetUserId: customerId,
      targetUserType: "CUSTOMER",
      senderName: sellerName,
      preview: `${sellerName} yorumunuza yanıt verdi.`,
      sourceUserId: sellerId,
      sourceUserType: "SELLER",
      subject: "Yorum Yanıtı Bildirimi",
      notificationType: "review_notification",
    })
  } catch (err: unknown) {
    console.warn(
      "[review-notification] Could not resolve customer for seller reply notification:",
      (err as Error).message
    )
  }
}

export const config: SubscriberConfig = {
  event: "review_notification.seller_reply",
}
