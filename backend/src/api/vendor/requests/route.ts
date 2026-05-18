import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerRequest from "@mercurjs/requests/links/seller-request"

/**
 * GET /vendor/requests
 *
 * Overrides the @mercurjs/requests plugin handler to fix the `type` query
 * filter. MikroORM does not support filtering by nested entity properties
 * (e.g. `request.type`) when querying via a link table entry point —
 * passing `{ request: { type } }` in filters throws
 * "Trying to query by not existing property LinkModel.request".
 *
 * Fix: fetch all seller-scoped requests without a DB-level type filter,
 * then apply type and status filters in-memory before returning.
 * The response is TanStack-Query-cached on the client so this is one DB round-trip.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Clone and strip fields that can't be applied at the link-table DB level
  const filterableFields = { ...(req as any).filterableFields } as Record<
    string,
    unknown
  >
  const typeFilter = filterableFields.type as string | undefined
  const statusFilter = filterableFields.status as string | undefined
  delete filterableFields.type
  delete filterableFields.status

  // Fetch all requests for this seller (seller_id filter applied by
  // filterBySellerId middleware and stays valid on the link table)
  const { data: relations } = await query.graph({
    entity: (sellerRequest as any).entryPoint,
    fields: ((req as any).queryConfig.fields as string[]).map(
      (field) => `request.${field}`
    ),
    filters: {
      ...filterableFields,
      deleted_at: { $eq: null },
    },
    // No pagination here — we filter in-memory first, then slice
    pagination: { skip: 0, take: 10000 },
  })

  // Extract, guard against orphaned link rows where request was hard-deleted
  let requests = (relations as any[])
    .map((rel) => rel.request)
    .filter(Boolean)

  // Apply type and status filters in-memory
  if (typeFilter) {
    requests = requests.filter((r: any) => r.type === typeFilter)
  }
  if (statusFilter) {
    requests = requests.filter((r: any) => r.status === statusFilter)
  }

  // Apply pagination after in-memory filtering
  const pagination = (req as any).queryConfig.pagination as {
    skip: number
    take: number
  }
  const total = requests.length
  const paginated = requests.slice(
    pagination.skip,
    pagination.skip + pagination.take
  )

  res.json({
    requests: paginated,
    count: total,
    offset: pagination.skip,
    limit: pagination.take,
  })
}
