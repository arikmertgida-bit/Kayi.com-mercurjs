import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"

/**
 * GET /store/campaigns
 * Query params:
 *   status=active    → starts_at <= now < ends_at
 *   status=upcoming  → starts_at > now (and ends_at exists)
 *   limit (default 24, max 48)
 *   offset (default 0)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  const status = (req.query.status as string) || "active"
  const limit = Math.min(parseInt(req.query.limit as string) || 24, 48)
  const offset = parseInt(req.query.offset as string) || 0

  const now = new Date()

  let filters: Record<string, unknown> = { deleted_at: null }

  if (status === "active") {
    // starts_at <= now AND ends_at > now
    filters = {
      ...filters,
      starts_at: { $lte: now },
      ends_at: { $gt: now },
    }
  } else if (status === "upcoming") {
    // starts_at > now (campaign not started yet)
    filters = {
      ...filters,
      starts_at: { $gt: now },
    }
  }

  const [campaigns, count] = await promotionService.listAndCountCampaigns(
    filters,
    {
      relations: ["budget"],
      skip: offset,
      take: limit,
    }
  )

  return res.json({ campaigns, count, limit, offset })
}
