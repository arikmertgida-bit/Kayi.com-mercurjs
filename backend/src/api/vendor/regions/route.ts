import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

/**
 * GET /vendor/regions
 *
 * Returns all active regions from the Medusa database.
 * This endpoint is read-only for vendors — region management is admin-only.
 * Authentication: vendor session or bearer token (enforced by MercurJS middleware).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Verify the request comes from an authenticated vendor seller.
  await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  const regionService = req.scope.resolve(Modules.REGION)

  const regions = await regionService.listRegions(
    {},
    {
      relations: ["countries"],
      select: ["id", "name", "currency_code", "created_at", "updated_at"],
    }
  )

  return res.status(200).json({
    regions,
    count: regions.length,
    offset: 0,
    limit: regions.length,
  })
}
