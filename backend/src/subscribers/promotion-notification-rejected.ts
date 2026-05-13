import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyMessengerUser } from "../lib/messenger"

interface PromotionRejectedPayload {
  promotion_id: string
  seller_id: string
  reason: string
}

export default async function promotionNotificationRejectedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PromotionRejectedPayload>) {
  const { promotion_id, seller_id, reason } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!seller_id) {
    logger.warn("[promotion-rejected] Missing seller_id in payload — skipping notification")
    return
  }

  try {
    await notifyMessengerUser({
      targetUserId: seller_id,
      targetUserType: "SELLER",
      senderName: "Yönetici",
      preview: `Promosyonunuz reddedildi. Red sebebi: ${reason}`,
      conversationType: "ADMIN_SUPPORT",
      notificationType: "promotion_rejected",
    })
    logger.info(
      `[promotion-rejected] Messenger notification sent for seller ${seller_id}, promotion ${promotion_id}`
    )
  } catch (err: unknown) {
    // Non-fatal: notification failure must not block the rejection workflow
    logger.warn(
      `[promotion-rejected] Messenger notification failed for seller ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }
}

export const config: SubscriberConfig = {
  event: "seller.promotion_rejected",
  context: {
    subscriberId: "promotion-rejected-email-handler",
  },
}
