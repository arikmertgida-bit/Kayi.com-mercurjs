import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CreateCampaignDTO, IPromotionModuleService } from "@medusajs/types"

export type CreateCampaignEntityInput = {
  name: string
  campaign_identifier: string
  starts_at?: Date
  ends_at?: Date
  metadata: Record<string, unknown>
}

/**
 * Creates a MedusaJS campaign entity.
 *
 * Compensation: deletes the campaign if a later step in the workflow fails,
 * preventing orphaned campaign records in the database.
 */
export const createCampaignEntityStep = createStep(
  "create-campaign-entity",
  async (input: CreateCampaignEntityInput, { container }) => {
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

    const dto = Object.assign(
      {
        name: input.name,
        campaign_identifier: input.campaign_identifier,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
      } as CreateCampaignDTO,
      { metadata: input.metadata }
    )

    const campaign = await promotionService.createCampaigns(dto)

    return new StepResponse(campaign.id, campaign.id)
  },
  async (campaignId: string | undefined, { container }) => {
    if (!campaignId) return
    const logger = container.resolve<{
      error: (...args: unknown[]) => void
    }>(ContainerRegistrationKeys.LOGGER)
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)
    await promotionService.deleteCampaigns(campaignId).catch((err: unknown) => {
      logger.error(
        `CRITICAL: Workflow compensation failed — orphaned campaign detected! ` +
          `campaignId: ${campaignId} | ` +
          `error: ${err instanceof Error ? err.message : String(err)}`
      )
    })
  }
)
