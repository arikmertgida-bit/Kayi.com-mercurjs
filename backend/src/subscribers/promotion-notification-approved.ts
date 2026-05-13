import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/types"
import { fetchStoreData } from "@mercurjs/framework"

interface PromotionApprovedPayload {
  promotion_id: string
  seller_id: string
  promotion_code: string
}

/** Shape of a member row returned from query.graph */
type MemberRow = { email?: string | null; first_name?: string | null }

/**
 * Handles the "seller.promotion_approved" event.
 *
 * Sends an email notification to the seller when their promotion is approved.
 * Soft fail pattern: missing member email or store data does NOT crash the subscriber.
 *
 * Resend template: "sellerPromotionApprovedEmailTemplate"
 * Template variables: { promotion_code, store_name, storefront_url }
 */
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
    logger.warn("[promotion-approved] Missing seller_id in payload — skipping email")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Find the seller's member email via the member link table
  let memberEmail: string | null = null
  try {
    const { data: members } = await query.graph({
      entity: "member",
      fields: ["email", "first_name"],
      filters: { seller_id },
    })

    const member = (members[0] as unknown as MemberRow) ?? null
    memberEmail = member?.email ?? null
  } catch (err: unknown) {
    logger.warn(
      `[promotion-approved] Could not resolve member email for seller ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
    return
  }

  if (!memberEmail) {
    logger.warn(
      `[promotion-approved] No email found for seller ${seller_id}, promotion ${promotion_id} — skipping email`
    )
    return
  }

  // Fetch store metadata (store_name, storefront_url) for email context
  let storeData: { store_name: string; storefront_url: string }
  try {
    storeData = await fetchStoreData(container)
  } catch (err: unknown) {
    logger.warn(
      `[promotion-approved] Could not fetch store data: ` +
        (err instanceof Error ? err.message : String(err))
    )
    return
  }

  const notificationService = container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  try {
    await notificationService.createNotifications({
      to: memberEmail,
      channel: "email",
      template: "sellerPromotionApprovedEmailTemplate",
      content: {
        subject: `${storeData.store_name} - Promosyonunuz Onaylandı!`,
      },
      data: {
        data: {
          promotion_code,
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })

    logger.info(
      `[promotion-approved] Email sent to ${memberEmail} for promotion ${promotion_id}`
    )
  } catch (err: unknown) {
    // Non-fatal: email failure must not block the approval workflow
    logger.warn(
      `[promotion-approved] Failed to send email to ${memberEmail}: ` +
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
