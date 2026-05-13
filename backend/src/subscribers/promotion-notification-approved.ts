import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyMessengerUser } from "../lib/messenger"

interface PromotionApprovedPayload {
  promotion_id: string
  seller_id: string
  promotion_code: string
}

export default async function promotionNotificationApprovedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PromotionApprovedPayload>) {
  const { promotion_id, seller_id, promotion_code } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!seller_id) {
    logger.warn("[promotion-approved] Missing seller_id in payload — skipping notification")
    return
  }

  try {
    await notifyMessengerUser({
      targetUserId: seller_id,
      targetUserType: "SELLER",
      senderName: "Yönetici",
      preview: `Promosyon kodunuz (${promotion_code}) yönetici tarafından aktif edilmiştir.`,
      conversationType: "ADMIN_SUPPORT",
      notificationType: "promotion_approved",
    })
    logger.info(
      `[promotion-approved] Messenger notification sent for seller ${seller_id}, promotion ${promotion_id}`
    )
  } catch (err: unknown) {
    // Non-fatal: notification failure must not block the approval workflow
    logger.warn(
      `[promotion-approved] Messenger notification failed for seller ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }
}

export const config: SubscriberConfig = {
  event: "seller.promotion_approved",
  context: {
    subscriberId: "promotion-approved-email-handler",
  },
}
