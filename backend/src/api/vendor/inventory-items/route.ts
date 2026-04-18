import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const filterableFields = req.filterableFields as Record<string, any>
  const sellerId = filterableFields.seller_id as string
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
  const [{ count }] = await countQuery
  const totalCount = parseInt(count as string, 10)

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
