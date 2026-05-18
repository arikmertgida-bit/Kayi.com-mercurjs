import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"

const UpdateSellerRegionsSchema = z.object({
  region_ids: z.array(z.string()),
})

/**
 * GET /vendor/sellers/me/regions
 * Returns the seller's selected region IDs from the seller-region link table.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "seller",
    filters: { members: { id: req.auth_context.actor_id } },
    fields: ["id", "regions.id"],
  })

  const seller = data[0] as { id: string; regions?: Array<{ id: string }> } | undefined

  if (!seller) {
    res.status(404).json({ message: "Seller not found" })
    return
  }

  const region_ids = seller.regions?.map((r) => r.id) ?? []
  res.json({ region_ids })
}

/**
 * POST /vendor/sellers/me/regions
 * Replaces the seller's region links with the provided region IDs.
 * Accepts: { region_ids: string[] }
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const parsed = UpdateSellerRegionsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues })
    return
  }

  const { data } = await query.graph({
    entity: "seller",
    filters: { members: { id: req.auth_context.actor_id } },
    fields: ["id", "regions.id"],
  })

  const seller = data[0] as { id: string; regions?: Array<{ id: string }> } | undefined

  if (!seller) {
    res.status(404).json({ message: "Seller not found" })
    return
  }

  const sellerId = seller.id
  const currentIds = seller.regions?.map((r) => r.id) ?? []
  const newIds = parsed.data.region_ids

  const toRemove = currentIds.filter((id) => !newIds.includes(id))
  const toAdd = newIds.filter((id) => !currentIds.includes(id))

  if (toRemove.length > 0) {
    await remoteLink.dismiss(
      toRemove.map((region_id) => ({
        seller: { seller_id: sellerId },
        [Modules.REGION]: { region_id },
      }))
    )
  }

  if (toAdd.length > 0) {
    await remoteLink.create(
      toAdd.map((region_id) => ({
        seller: { seller_id: sellerId },
        [Modules.REGION]: { region_id },
      }))
    )
  }

  res.json({ region_ids: newIds })
}
