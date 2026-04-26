import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

function applyOperatorFilter(query: any, column: string, filter: any): any {
  if (filter === null || filter === undefined) return query
  if (typeof filter === "string" || typeof filter === "number")
    return query.where(column, "=", filter)
  if (typeof filter === "object" && !Array.isArray(filter)) {
    let q = query
    if (filter.$gte !== undefined) q = q.where(column, ">=", filter.$gte)
    if (filter.$gt !== undefined)  q = q.where(column, ">",  filter.$gt)
    if (filter.$lte !== undefined) q = q.where(column, "<=", filter.$lte)
    if (filter.$lt !== undefined)  q = q.where(column, "<",  filter.$lt)
    if (filter.$eq !== undefined)  q = q.where(column, "=",  filter.$eq)
    if (filter.$ne !== undefined)  q = q.where(column, "!=", filter.$ne)
    if (filter.$in !== undefined)  q = q.whereIn(column, filter.$in)
    if (filter.$nin !== undefined) q = q.whereNotIn(column, filter.$nin)
    if (filter.$ilike !== undefined) q = q.whereRaw(`${column} ILIKE ?`, [filter.$ilike])
    return q
  }
  return query
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Ownership check: authenticated actor must own the queried seller
  const authenticatedSeller = await fetchSellerByAuthActorId(
    (req as any).auth_context.actor_id,
    req.scope
  )

  const f = req.filterableFields as Record<string, any>
  const skip = req.queryConfig.pagination?.skip || 0
  const take = req.queryConfig.pagination?.take || 10
  // Enforce: always use the authenticated seller's id, never trust user input
  const sellerId = authenticatedSeller.id
  const salesChannelId = f.sales_channel_id as string | undefined

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

  if (f.q && f.q.length >= 2) {
    const sanitized = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`
    baseQuery = baseQuery.where((builder: any) => {
      builder
        .whereRaw("product.title ILIKE ?", [sanitized])
        .orWhereRaw("product.description ILIKE ?", [sanitized])
    })
  }

  if (f.type_id) {
    const ids = Array.isArray(f.type_id) ? f.type_id : [f.type_id]
    baseQuery = baseQuery.whereIn("product.type_id", ids)
  }

  if (f.collection_id) {
    const ids = Array.isArray(f.collection_id) ? f.collection_id : [f.collection_id]
    baseQuery = baseQuery.whereIn("product.collection_id", ids)
  }

  if (f.status) {
    const arr = Array.isArray(f.status) ? f.status : [f.status]
    baseQuery = baseQuery.whereIn("product.status", arr)
  }

  if (f.is_giftcard !== undefined && f.is_giftcard !== null) {
    baseQuery = baseQuery.where("product.is_giftcard", f.is_giftcard)
  }

  // transformProductParams dönüşümü: tag_id → tags.id, category_id → categories.id
  // req.query üzerinden de kontrol et (dönüşüm öncesi ham değer)
  const rawTagId = (req.query as any).tag_id
  const tagIds = rawTagId
    ? (Array.isArray(rawTagId) ? rawTagId : [rawTagId])
    : f.tags?.id
      ? (Array.isArray(f.tags.id) ? f.tags.id : [f.tags.id])
      : null
  if (tagIds) {
    baseQuery = baseQuery
      .innerJoin("product_tags", "product.id", "product_tags.product_id")
      .whereIn("product_tags.product_tag_id", tagIds)
  }

  const categoryIds = f.categories?.id
  if (categoryIds) {
    const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds]
    baseQuery = baseQuery
      .innerJoin(
        "product_category_product",
        "product.id",
        "product_category_product.product_id"
      )
      .whereIn("product_category_product.product_category_id", ids)
  }

  baseQuery = applyOperatorFilter(baseQuery, "product.created_at", f.created_at)
  baseQuery = applyOperatorFilter(baseQuery, "product.updated_at", f.updated_at)

  const countQuery = baseQuery.clone().clearSelect().count("product.id as count")
  const countResult = await countQuery
  const totalCount = parseInt((countResult[0]?.count ?? "0") as string, 10)

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

  const requestedFields = req.queryConfig.fields ?? []
  const fields = requestedFields.includes("*categories")
    ? requestedFields
    : [...requestedFields, "*categories"]

  const { data: sellerProducts } = await query.graph({
    entity: "product",
    fields,
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
