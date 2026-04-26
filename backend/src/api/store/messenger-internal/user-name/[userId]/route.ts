import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

if (!process.env.MESSENGER_INTERNAL_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[messenger-internal] MESSENGER_INTERNAL_SECRET env variable must be set in production")
  }
  console.warn("[messenger-internal] WARNING: MESSENGER_INTERNAL_SECRET is not set — using insecure default.")
}

const MESSENGER_INTERNAL_SECRET =
  process.env.MESSENGER_INTERNAL_SECRET ?? "kayi-internal-secret"

/**
 * GET /store/messenger-internal/user-name/:userId
 *
 * Internal endpoint called by kayi-messenger to resolve a user's display name.
 * Protected by x-internal-secret header.
 * Accepts both customer IDs (cus_...) and member IDs (mem_...).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const secret = req.headers["x-internal-secret"]
  if (secret !== MESSENGER_INTERNAL_SECRET) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { userId } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Customer lookup (cus_...)
  if (userId.startsWith("cus_")) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "email"],
        filters: { id: userId },
      })
      if (customers.length) {
        const c = customers[0] as any
        const name =
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          c.email ||
          userId
        return res.json({ userId, displayName: name })
      }
    } catch {
      // fall through
    }
  }

  // Member lookup (mem_...) — look up via seller members
  if (userId.startsWith("mem_")) {
    try {
      const { data: members } = await query.graph({
        entity: "seller_member",
        fields: ["id", "name", "email", "seller.name"],
        filters: { id: userId },
      })
      if (members.length) {
        const m = members[0] as any
        const name =
          m.name ||
          (m.seller as any)?.name ||
          m.email ||
          userId
        return res.json({ userId, displayName: name })
      }
    } catch {
      // fall through
    }
  }

  return res.json({ userId, displayName: userId })
}
