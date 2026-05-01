import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { notifyMessengerUser } from "../lib/messenger"

interface ReviewNotificationNewReviewPayload {
  sellerToNotify: string
  customerName: string
}

/**
 * Handles the "review_notification.new_review" event.
 * Notifies the seller in real-time when a customer submits a new review.
 * Reviews domain emits this event — messenger dependency is isolated here.
 */
export default async function reviewNotificationNewReviewSubscriber({
  event: { data },
}: SubscriberArgs<ReviewNotificationNewReviewPayload>) {
  const { sellerToNotify, customerName } = data

  // Sadece gerçek zamanlı bildirim — /messages'ta konuşma oluşturulmaz.
  // sourceUserId/sourceUserType bilinçli olarak verilmedi:
  // verilseydi kayi-messenger'da DIRECT konuşma açılırdı ve
  // yorum bildirimleri /messages alanında görünürdü.
  notifyMessengerUser({
    targetUserId: sellerToNotify,
    targetUserType: "SELLER",
    senderName: customerName,
    preview: `${customerName} ürününüze yeni bir yorum bıraktı.`,
    notificationType: "review_notification",
  })
}

export const config: SubscriberConfig = {
  event: "review_notification.new_review",
}
