import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"

export type CreateCampaignSellerLinksInput = {
  seller_id: string
  campaign_id: string
  promotion_id: string
}

type LinkCompensationData = CreateCampaignSellerLinksInput

/**
 * Creates seller↔campaign and seller↔promotion link table entries via remoteLink.
 *
 * Compensation: dismisses both links if a later step in the workflow fails,
 * ensuring no orphaned link records remain when the campaign/promotion are deleted.
 */
export const createCampaignSellerLinksStep = createStep(
  "create-campaign-seller-links",
  async (input: CreateCampaignSellerLinksInput, { container }) => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    await remoteLink.create([
      {
        seller: { seller_id: input.seller_id },
        [Modules.PROMOTION]: { campaign_id: input.campaign_id },
      },
      {
        seller: { seller_id: input.seller_id },
        [Modules.PROMOTION]: { promotion_id: input.promotion_id },
      },
    ])

    return new StepResponse(undefined, {
      seller_id: input.seller_id,
      campaign_id: input.campaign_id,
      promotion_id: input.promotion_id,
    } satisfies LinkCompensationData)
  },
  async (compensation: LinkCompensationData | undefined, { container }) => {
    if (!compensation) return
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const entryPointCampaign = sellerCampaign.entryPoint
    const entryPointPromotion = sellerPromotion.entryPoint

    await remoteLink
      .dismiss([
        {
          [entryPointCampaign]: {
            seller_id: compensation.seller_id,
            campaign_id: compensation.campaign_id,
          },
        },
        {
          [entryPointPromotion]: {
            seller_id: compensation.seller_id,
            promotion_id: compensation.promotion_id,
          },
        },
      ])
      .catch(() => {
        // Non-fatal: links may already be absent.
      })
  }
)
