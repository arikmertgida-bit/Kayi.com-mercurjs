import { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface ResolvedSeller {
  id: string
  name: string | null
}

/**
 * Resolves the authenticated seller from vendor auth context.
 * Returns null if the actor is not authenticated or not a seller member.
 */
export async function resolveSeller(req: MedusaRequest): Promise<ResolvedSeller | null> {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) return null
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "seller",
    filters: { members: { id: actorId } },
    fields: ["id", "name"],
  })
  return (data?.[0] as ResolvedSeller | undefined) ?? null
}
