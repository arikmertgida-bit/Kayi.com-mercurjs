import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import {
  CreatePromotionRuleDTO,
  IPromotionModuleService,
} from "@medusajs/types"

export type CreateAutomaticPromotionForCampaignInput = {
  name: string
  promotion_code: string
  discount_value: number
  campaign_id: string
  product_ids: string[]
  metadata: Record<string, unknown>
}

/**
 * Creates an is_automatic:true promotion linked to the given campaign, then
 * attaches product target rules if product_ids are provided.
 *
 * Compensation: deletes the promotion if a later step in the workflow fails,
 * preventing orphaned promotion records tied to a deleted campaign.
 */
export const createAutomaticPromotionForCampaignStep = createStep(
  "create-automatic-promotion-for-campaign",
  async (input: CreateAutomaticPromotionForCampaignInput, { container }) => {
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

    const promotion = await promotionService.createPromotions(
      Object.assign(
        {
          name: input.name,
          code: input.promotion_code,
          type: "standard" as import("@medusajs/types").PromotionTypeValues,
          is_automatic: true,
          status: PromotionStatus.ACTIVE,
          campaign_id: input.campaign_id,
          application_method: {
            type: "percentage" as import("@medusajs/types").ApplicationMethodTypeValues,
            target_type: "items" as import("@medusajs/types").ApplicationMethodTargetTypeValues,
            allocation: "each" as import("@medusajs/types").ApplicationMethodAllocationValues,
            value: input.discount_value,
            max_quantity: 1,
          },
        },
        { metadata: input.metadata }
      )
    )

    if (input.product_ids.length > 0) {
      const rules: CreatePromotionRuleDTO[] = [
        {
          attribute: "items.product.id",
          operator: "in",
          values: input.product_ids,
        },
      ]
      await promotionService.addPromotionTargetRules(promotion.id, rules)
    }

    return new StepResponse(promotion.id, promotion.id)
  },
  async (promotionId: string | undefined, { container }) => {
    if (!promotionId) return
    const logger = container.resolve<{
      error: (...args: unknown[]) => void
    }>(ContainerRegistrationKeys.LOGGER)
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)
    await promotionService.deletePromotions(promotionId).catch((err: unknown) => {
      logger.error(
        `CRITICAL: Workflow compensation failed — orphaned promotion detected! ` +
          `promotionId: ${promotionId} | ` +
          `error: ${err instanceof Error ? err.message : String(err)}`
      )
    })
  }
)
