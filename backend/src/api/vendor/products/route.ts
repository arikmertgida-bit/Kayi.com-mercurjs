import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const filterableFields = req.filterableFields as Record<string, any>
  const q = filterableFields.q as string | undefined
  const skip = req.queryConfig.pagination?.skip || 0
  const take = req.queryConfig.pagination?.take || 10
  const sellerId = filterableFields.seller_id as string
  const salesChannelId = filterableFields.sales_channel_id as string | undefined

  let baseQuery = knex("product")
    .distinct("product.id")
    .innerJoin(
      "seller_seller_product_product",
      "product.id",
      "seller_seller_product_product.product_id"
    )
    .where({
      "seller_seller_product_product.seller_id": sellerId,
      "seller_seller_product_product.deleted_at": null,
      "product.deleted_at": null,
    })

  if (salesChannelId) {
    baseQuery = baseQuery
      .innerJoin(
        "product_sales_channel",
        "product.id",
        "product_sales_channel.product_id"
      )
      .where("product_sales_channel.sales_channel_id", salesChannelId)
  }

  if (q && q.length >= 2) {
    baseQuery = baseQuery.whereRaw("product.title ILIKE ?", [`%${q}%`])
  }

  const countQuery = baseQuery.clone().clearSelect().count("product.id as count")
  const [{ count }] = await countQuery
  const totalCount = parseInt(count as string, 10)

  const productIds: string[] = await baseQuery
    .offset(skip)
    .limit(take)
    .pluck("product.id")

  if (productIds.length === 0) {
    return res.json({
      products: [],
      count: totalCount,
      offset: skip,
      limit: take,
    })
  }

  const { data: sellerProducts } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: {
      id: productIds,
    },
  })

  res.json({
    products: sellerProducts,
    count: totalCount,
    offset: skip,
    limit: take,
  })
}
