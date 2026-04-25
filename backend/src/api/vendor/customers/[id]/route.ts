import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

/**
 * GET /vendor/customers/:id
 *
 * Returns basic customer display info (name, email) for use in the vendor
 * panel messaging UI. Requires valid seller auth token.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Require seller authentication
  await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "last_name", "email"],
    filters: { id },
  })

  if (!customers.length) {
    return res.status(404).json({ message: "Customer not found" })
  }

  return res.json({ customer: customers[0] })
}
