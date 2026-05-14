import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IUserModuleService } from "@medusajs/types"
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
  const { promotion_id, seller_id } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!seller_id) {
    logger.warn("[promotion-approved] Missing seller_id in payload — skipping notification")
    return
  }

  // Fetch the primary admin user — same logic as vendor/support/admin-contact so the
  // notification always lands in the vendor's existing "Satıcı Destek" conversation.
  let adminUserId: string | null = null
  try {
    const userService = container.resolve<IUserModuleService>(Modules.USER)
    const users = await userService.listUsers(
      {},
      { take: 10, order: { created_at: "DESC" } }
    )
    const adminUser =
      users.find(
        (u) =>
          u.email &&
          !u.email.toLowerCase().includes("test") &&
          !u.email.toLowerCase().includes("seed")
      ) ?? users[0]
    adminUserId = adminUser?.id ?? null
  } catch (err: unknown) {
    logger.warn(
      `[promotion-approved] Could not resolve admin user: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // Resolve seller MEMBER IDs (mem_...) from the seller entity ID (sel_...).
  // Vendor panel JWTs carry actor_id = mem_... (seller member id), NOT sel_...
  // so kayi-messenger rooms are user:mem_... — notification must target member IDs.
  const linkQuery = container.resolve(ContainerRegistrationKeys.QUERY)
  let targetUserIds: string[] = [seller_id] // fallback: entity id
  try {
    const { data: sellerRows } = await linkQuery.graph({
      entity: "seller",
      fields: ["id", "members.id"],
      filters: { id: seller_id },
    })
    const members = ((sellerRows[0] as unknown as { members?: Array<{ id: string }> })?.members ?? [])
    const memberIds = members.map((m) => m.id).filter((id) => id.startsWith("mem_"))
    if (memberIds.length > 0) targetUserIds = memberIds
  } catch (err: unknown) {
    logger.warn(
      `[promotion-approved] Could not resolve seller members for ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  const vendorPanelUrl = process.env.VENDOR_PANEL_URL ?? "http://localhost:7001"
  const promotionLink = `${vendorPanelUrl}/promotions/${promotion_id}`

  for (const targetUserId of targetUserIds) {
    try {
      await notifyMessengerUser({
        targetUserId,
        targetUserType: "SELLER",
        ...(adminUserId ? { sourceUserId: adminUserId, sourceUserType: "ADMIN" } : {}),
        senderName: "Yönetici",
        preview: `Promosyonunuz onaylandı. ${promotionLink}`,
        subject: "Promosyon Bildirimi",
        conversationType: "ADMIN_SUPPORT",
        notificationType: "promotion_approved",
      })
      logger.info(
        `[promotion-approved] Messenger notification sent to ${targetUserId} for promotion ${promotion_id}`
      )
    } catch (err: unknown) {
      // Non-fatal: notification failure must not block the approval workflow
      logger.warn(
        `[promotion-approved] Messenger notification failed for ${targetUserId}: ` +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "seller.promotion_approved",
  context: {
    subscriberId: "promotion-approved-email-handler",
  },
}
