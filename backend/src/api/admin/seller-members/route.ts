import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/seller-members
 * Returns a list of member records with their seller name and photo.
 * Used by the admin panel to resolve seller info from a member ID.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: members } = await query.graph({
    entity: "member",
    fields: ["id", "name", "photo", "seller.id", "seller.name", "seller.photo"],
  })

  res.json({ members })
}
