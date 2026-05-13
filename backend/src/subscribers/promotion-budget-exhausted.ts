import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import {
  IEventBusModuleService,
  IPromotionModuleService,
} from "@medusajs/types"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { CampaignWithMeta } from "../api/vendor/shared/promotion-types.js"
import { notifyMessengerUser } from "../lib/messenger.js"

/** Payload shape emitted by campaigns/[id]/route.ts PUT handler and order-promotion-budget-check.ts */
interface BudgetExhaustedPayload {
  campaign_id: string
  seller_id: string
}

/** Shape of a row returned from the seller_campaign link table */
type SellerCampaignLinkRow = { seller_id: string }

/** Campaign with promotions loaded via listCampaigns + relations */
type CampaignWithPromotions = CampaignWithMeta & {
  promotions?: Array<{ id: string; status?: string | null }> | null
}

/**
 * Handles the "promotion.budget_exhausted" event.
 *
 * Steps:
 * 1. Resolve seller_id (from payload or via seller_campaign link table)
 * 2. List the campaign's promotions and deactivate all active ones
 * 3. Emit seller.promotion_budget_exhausted for downstream handlers (e.g. email)
 * 4. Notify the seller via kayi-messenger
 *
 * Each promotion is deactivated independently — a failure for one does NOT
 * prevent the others or the notification from being processed.
 */
export default async function promotionBudgetExhaustedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<BudgetExhaustedPayload>) {
  const { campaign_id, seller_id } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!campaign_id) {
    logger.warn("[budget-exhausted] Missing campaign_id in event data — skipping")
    return
  }

  // ── Resolve seller_id if not already provided ──────────────────────────────
  let targetSellerId = seller_id

  if (!targetSellerId) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: links } = await query.graph({
      entity: sellerCampaign.entryPoint,
      fields: ["seller_id"],
      filters: { campaign_id, deleted_at: { $eq: null } },
    })

    const row = (links as SellerCampaignLinkRow[])[0]
    if (!row?.seller_id) {
      logger.warn(
        `[budget-exhausted] Could not resolve seller for campaign ${campaign_id} — skipping notification`
      )
      return
    }
    targetSellerId = row.seller_id
  }

  // ── Deactivate active promotions belonging to the exhausted campaign ────────
  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  let deactivatedCount = 0

  try {
    const campaigns = (await promotionService.listCampaigns(
      { id: [campaign_id] },
      { relations: ["promotions"] }
    )) as CampaignWithPromotions[]

    const campaign = campaigns[0]
    const activePromotions = (campaign?.promotions ?? []).filter(
      (p) => p.status === "active"
    )

    logger.info(
      `[budget-exhausted] Campaign ${campaign_id} has ${activePromotions.length} active promotion(s) to deactivate`
    )

    for (const promo of activePromotions) {
      try {
        await promotionService.updatePromotions(
          Object.assign({ id: promo.id }, { status: PromotionStatus.INACTIVE })
        )
        deactivatedCount++
        logger.info(`[budget-exhausted] Deactivated promotion ${promo.id}`)
      } catch (err: unknown) {
        logger.warn(
          `[budget-exhausted] Failed to deactivate promotion ${promo.id}: ` +
            (err instanceof Error ? err.message : String(err))
        )
      }
    }
  } catch (err: unknown) {
    logger.warn(
      `[budget-exhausted] Failed to list/deactivate promotions for campaign ${campaign_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── Emit seller notification event (for future email/resend integration) ───
  try {
    await eventBus.emit({
      name: "seller.promotion_budget_exhausted",
      data: {
        seller_id: targetSellerId,
        campaign_id,
        deactivated_count: deactivatedCount,
      },
    })
    logger.info(
      `[budget-exhausted] Emitted seller.promotion_budget_exhausted for seller ${targetSellerId} ` +
        `(campaign: ${campaign_id}, deactivated: ${deactivatedCount})`
    )
  } catch (err: unknown) {
    logger.warn(
      `[budget-exhausted] Failed to emit seller event: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── Messenger notification (existing logic) ─────────────────────────────────
  try {
    notifyMessengerUser({
      targetUserId: targetSellerId,
      targetUserType: "SELLER",
      notificationType: "budget_exhausted",
      preview: "Kampanya bütçeniz tükendi. Kampanyanız otomatik olarak duraklatıldı.",
      subject: "Kampanya Bütçe Uyarısı",
    })

    logger.info(
      `[budget-exhausted] Notification dispatched to seller ${targetSellerId} for campaign ${campaign_id}`
    )
  } catch (err: unknown) {
    logger.warn(
      "[budget-exhausted] Failed to dispatch budget exhausted notification:",
      err instanceof Error ? err.message : err
    )
  }
}

export const config: SubscriberConfig = {
  event: "promotion.budget_exhausted",
}
