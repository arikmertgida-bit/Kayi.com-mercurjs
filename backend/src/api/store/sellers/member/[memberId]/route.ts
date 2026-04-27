import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/sellers/member/:memberId
 *
 * Public endpoint that returns a seller's display name and photo URL
 * for a given seller member ID (mem_...).
 * Used by the storefront messenger inbox to display seller avatars.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { memberId } = req.params

  if (!memberId || !memberId.startsWith("mem_")) {
    return res.json({ avatarUrl: null, displayName: null })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: members } = await query.graph({
      entity: "member",
      fields: ["id", "name", "email", "photo", "seller.id", "seller.name", "seller.handle", "seller.photo"],
      filters: { id: memberId },
    })

    if (members.length) {
      const m = members[0] as any
      const seller = m.seller as any
      return res.json({
        avatarUrl: m.photo ?? null,
        displayName: m.name || seller?.name || null,
        sellerId: seller?.id ?? null,
        sellerName: seller?.name ?? null,
        sellerHandle: seller?.handle ?? null,
        sellerPhoto: seller?.photo ?? null,
      })
    }
  } catch (err) {
    console.error("[store/sellers/member] GET error:", err)
  }

  return res.json({ avatarUrl: null, displayName: null })
}
