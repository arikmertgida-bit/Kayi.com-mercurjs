import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Ownership check: authenticated actor must own the queried seller
  const authenticatedSeller = await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  const filterableFields = req.filterableFields as Record<string, any>
  // Enforce: always use the authenticated seller's id, never trust user input
  const sellerId = authenticatedSeller.id
  const q = filterableFields.q as string | undefined
  const skip = req.queryConfig.pagination?.skip || 0
  const take = req.queryConfig.pagination?.take || 20

  let baseQuery = knex("inventory_item")
    .distinct("inventory_item.id")
    .innerJoin(
      "seller_seller_inventory_inventory_item",
      "inventory_item.id",
      "seller_seller_inventory_inventory_item.inventory_item_id"
    )
    .where({
      "seller_seller_inventory_inventory_item.seller_id": sellerId,
      "seller_seller_inventory_inventory_item.deleted_at": null,
      "inventory_item.deleted_at": null,
    })

  if (q && q.length >= 2) {
    const sanitized = `%${q.replace(/[%_\\]/g, "\\$&")}%`
    baseQuery = baseQuery.where((builder) => {
      builder
        .whereRaw("inventory_item.title ILIKE ?", [sanitized])
        .orWhereRaw("inventory_item.sku ILIKE ?", [sanitized])
    })
  }

  const countQuery = baseQuery
    .clone()
    .clearSelect()
    .count("inventory_item.id as count")
  const countResult = await countQuery
  const totalCount = parseInt((countResult[0]?.count ?? "0") as string, 10)

  const inventoryItemIds: string[] = await baseQuery
    .offset(skip)
    .limit(take)
    .pluck("inventory_item.id")

  if (inventoryItemIds.length === 0) {
    return res.json({
      inventory_items: [],
      count: totalCount,
      offset: skip,
      limit: take,
    })
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: req.queryConfig.fields,
    filters: {
      id: inventoryItemIds,
    },
  })

  res.json({
    inventory_items: inventoryItems,
    count: totalCount,
    offset: skip,
    limit: take,
  })
}
