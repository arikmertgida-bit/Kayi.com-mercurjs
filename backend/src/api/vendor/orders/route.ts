import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { getVendorOrdersListWorkflow } from "@mercurjs/b2c-core/workflows"

/**
 * GET /vendor/orders
 *
 * Overrides the MercurJS default handler to handle `fulfillment_status`
 * filtering in-memory, since it is a computed field (not a DB column) in
 * Medusa 2.11+.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  const { data: orderRelations } = await query.graph({
    entity: sellerOrder.entryPoint,
    fields: ["order_id"],
    filters: {
      seller_id: seller.id,
      deleted_at: { $eq: null },
    },
  })

  // Extract fulfillment_status before passing filters to the workflow.
  // It is a computed field — not a real DB column — so passing it to the
  // Medusa remote query causes a 500 error in Medusa 2.11+.
  const filterableFields = { ...req.filterableFields }
  const fulfillmentStatusFilter: string | undefined =
    filterableFields.fulfillment_status as string | undefined
  delete filterableFields.fulfillment_status

  const pagination = { ...req.queryConfig.pagination }

  if (fulfillmentStatusFilter) {
    // Fetch all orders for this seller (no pagination yet) so we can
    // filter by computed fulfillment_status and then paginate in-memory.
    const requestedOffset = Number(pagination.skip ?? 0)
    const requestedLimit = Number(pagination.take ?? 10)

    const { result } = await getVendorOrdersListWorkflow(req.scope).run({
      input: {
        fields: req.queryConfig.fields,
        variables: {
          filters: {
            ...filterableFields,
            id: orderRelations.map((r) => r.order_id),
          },
          skip: 0,
          take: 1000,
        },
      },
    })

    const { rows, metadata } = result as any
    const allRows: any[] = rows ?? result

    const filtered = allRows.filter(
      (order: any) => order.fulfillment_status === fulfillmentStatusFilter
    )

    const paginated = filtered.slice(
      requestedOffset,
      requestedOffset + requestedLimit
    )

    return res.json({
      orders: paginated,
      count: filtered.length,
      offset: requestedOffset,
      limit: requestedLimit,
    })
  }

  // No fulfillment_status filter — normal paginated query.
  const { result } = await getVendorOrdersListWorkflow(req.scope).run({
    input: {
      fields: req.queryConfig.fields,
      variables: {
        filters: {
          ...filterableFields,
          id: orderRelations.map((r) => r.order_id),
        },
        ...pagination,
      },
    },
  })

  const { rows, metadata } = result as any

  res.json({
    orders: rows,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
