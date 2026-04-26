import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaRequest } from "@medusajs/framework/http"

export interface EnrichedReply {
  [key: string]: any
  customer: {
    first_name: string
    last_name: string
    avatar_url?: string
  } | null
  is_seller_reply: boolean
}

/**
 * Enriches a list of review replies with customer display data (name, avatar).
 * Performs a single batched query regardless of reply count — no N+1.
 */
export async function enrichRepliesWithCustomerData(
  replies: any[],
  req: MedusaRequest
): Promise<EnrichedReply[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerIds = [...new Set(replies.map((r) => r.customer_id).filter(Boolean))]

  let customerMap: Record<string, { first_name: string; last_name: string; avatar_url?: string }> = {}

  if (customerIds.length > 0) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "metadata"],
        filters: { id: customerIds },
      })
      for (const c of customers as any[]) {
        customerMap[c.id] = {
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          ...((c.metadata as any)?.avatar_url
            ? { avatar_url: (c.metadata as any).avatar_url }
            : {}),
        }
      }
    } catch {
      // Non-critical — return replies without customer names
    }
  }

  return replies.map((r) => ({
    ...r,
    is_seller_reply: !!r.seller_id,
    customer: r.customer_id
      ? (customerMap[r.customer_id] ?? { first_name: "Kullanıcı", last_name: "" })
      : null,
  }))
}
