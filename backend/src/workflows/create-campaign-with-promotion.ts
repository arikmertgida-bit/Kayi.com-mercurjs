import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  validateCampaignProductConflictsStep,
} from "./steps/validate-campaign-product-conflicts.js"
import {
  createCampaignEntityStep,
} from "./steps/create-campaign-entity.js"
import {
  createAutomaticPromotionForCampaignStep,
} from "./steps/create-automatic-promotion-for-campaign.js"
import {
  createCampaignSellerLinksStep,
} from "./steps/create-campaign-seller-links.js"

export type CreateCampaignWithPromotionInput = {
  seller_id: string
  name: string
  campaign_identifier: string
  promotion_code: string
  discount_value: number
  product_ids: string[]
  starts_at?: Date
  ends_at?: Date
  campaign_metadata: Record<string, unknown>
  promotion_metadata: Record<string, unknown>
}

export type CreateCampaignWithPromotionResult = {
  campaign_id: string
}

/**
 * Orchestrates the creation of a seller campaign together with its embedded
 * automatic promotion and the corresponding seller link table entries.
 *
 * Step order and compensation:
 *  1. validateCampaignProductConflictsStep  — no side-effects, no compensation
 *  2. createCampaignEntityStep              — compensation: deleteCampaigns
 *  3. createAutomaticPromotionForCampaign   — compensation: deletePromotions
 *  4. createCampaignSellerLinksStep         — compensation: remoteLink.dismiss
 *
 * If any step throws, the workflow engine runs compensations in reverse order,
 * so no manual try/catch compensation logic is needed in the HTTP handler.
 */
export const createCampaignWithPromotionWorkflow = createWorkflow(
  "create-campaign-with-promotion",
  (input: CreateCampaignWithPromotionInput) => {
    // Step 1: Validate — throws on conflict, no compensation required
    validateCampaignProductConflictsStep({
      seller_id: input.seller_id,
      product_ids: input.product_ids,
    })

    // Step 2: Create campaign entity
    const campaignId = createCampaignEntityStep({
      name: input.name,
      campaign_identifier: input.campaign_identifier,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      metadata: input.campaign_metadata,
    })

    // Step 3: Create promotion — needs campaign_id from step 2
    const promotionId = createAutomaticPromotionForCampaignStep(
      transform({ campaignId, input }, ({ campaignId, input }: { campaignId: string; input: CreateCampaignWithPromotionInput }) => ({
        name: input.name,
        promotion_code: input.promotion_code,
        discount_value: input.discount_value,
        campaign_id: campaignId,
        product_ids: input.product_ids,
        metadata: input.promotion_metadata,
      }))
    )

    // Step 4: Create seller link entries for both entities
    createCampaignSellerLinksStep(
      transform(
        { campaignId, promotionId, input },
        ({ campaignId, promotionId, input }: { campaignId: string; promotionId: string; input: CreateCampaignWithPromotionInput }) => ({
          seller_id: input.seller_id,
          campaign_id: campaignId,
          promotion_id: promotionId,
        })
      )
    )

    return new WorkflowResponse(
      transform({ campaignId }, ({ campaignId }: { campaignId: string }) => ({
        campaign_id: campaignId,
      }))
    )
  }
)
