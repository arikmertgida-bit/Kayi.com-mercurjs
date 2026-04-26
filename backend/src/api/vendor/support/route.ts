import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IUserModuleService } from "@medusajs/framework/types"

/**
 * GET /vendor/support/admin-contact
 * Returns the ID of the first admin user so vendors can create a support conversation.
 * Requires vendor authentication (actor_type: "seller").
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const userService: IUserModuleService = req.scope.resolve(Modules.USER)
  // Use DESC to pick the most recently created admin, which is the primary admin
  // (avoids returning test/seed accounts that were created earlier)
  const users = await userService.listUsers({}, { take: 10, order: { created_at: "DESC" } } as any)

  // Exclude obvious test/seed accounts
  const adminUser = users?.find((u: any) =>
    u.email && !u.email.toLowerCase().includes("test") && !u.email.toLowerCase().includes("seed")
  ) ?? users?.[0]

  if (!adminUser) {
    return res.status(404).json({ message: "No admin user found" })
  }

  return res.json({ adminUserId: adminUser.id })
}
