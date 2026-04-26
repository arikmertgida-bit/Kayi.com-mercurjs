import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /vendor/customer-avatar/:id
 * Returns avatar_url from customer metadata.
 * Requires vendor authentication.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id },
  })

  if (!customers.length) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const customer = customers[0] as any
  const avatarUrl = (customer.metadata?.avatar_url as string) ?? null

  return res.json({ avatar_url: avatarUrl })
}
