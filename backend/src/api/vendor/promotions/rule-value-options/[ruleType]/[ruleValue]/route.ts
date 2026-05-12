import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerProduct from "@mercurjs/b2c-core/links/seller-product"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const { ruleType, ruleValue } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // product and product_collection must be scoped to this seller's products
  if (ruleValue === "product") {
    const { data: links } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ["product_id"],
      filters: { seller_id: seller.id, deleted_at: { $eq: null } },
    })
    const productIds = (links as Array<{ product_id: string }>).map((l) => l.product_id)

    const { data: products, metadata } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail"],
      filters: { id: productIds, deleted_at: { $eq: null } },
      pagination: { take: limit, skip: offset },
    })

    const values = (products as Array<{ id: string; title: string; thumbnail: string | null }>).map(
      (p) => ({ value: p.id, label: p.title })
    )

    return res.json({
      values,
      count: metadata?.count ?? values.length,
      limit,
      offset,
    })
  }

  if (ruleValue === "product_collection") {
    // Get collections associated with seller's products
    const { data: productLinks } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ["product.collection_id"],
      filters: { seller_id: seller.id, deleted_at: { $eq: null } },
    })
    const collectionIds = [
      ...new Set(
        (productLinks as Array<{ product: { collection_id: string | null } }>)
          .map((l) => l.product?.collection_id)
          .filter((id): id is string => id != null)
      ),
    ]

    const { data: collections, metadata } = await query.graph({
      entity: "product_collection",
      fields: ["id", "title"],
      filters: { id: collectionIds },
      pagination: { take: limit, skip: offset },
    })

    const values = (collections as Array<{ id: string; title: string }>).map(
      (c) => ({ value: c.id, label: c.title })
    )

    return res.json({
      values,
      count: metadata?.count ?? values.length,
      limit,
      offset,
    })
  }

  // For all other ruleValues (region, currency_code, customer_group, etc.) use generic query
  const ruleQueryConfigurations: Record<string, { entryPoint: string; labelAttr: string; valueAttr: string }> = {
    region: { entryPoint: "region", labelAttr: "name", valueAttr: "id" },
    currency_code: { entryPoint: "currency", labelAttr: "name", valueAttr: "code" },
    customer_group: { entryPoint: "customer_group", labelAttr: "name", valueAttr: "id" },
    sales_channel: { entryPoint: "sales_channel", labelAttr: "name", valueAttr: "id" },
    country: { entryPoint: "country", labelAttr: "display_name", valueAttr: "iso_2" },
    product_category: { entryPoint: "product_category", labelAttr: "name", valueAttr: "id" },
    product_type: { entryPoint: "product_type", labelAttr: "value", valueAttr: "id" },
    product_tag: { entryPoint: "product_tag", labelAttr: "value", valueAttr: "id" },
  }

  const config = ruleQueryConfigurations[ruleValue]

  if (!config) {
    return res.json({ values: [], count: 0, limit, offset })
  }

  const { data: entities, metadata } = await query.graph({
    entity: config.entryPoint,
    fields: [config.valueAttr, config.labelAttr],
    pagination: { take: limit, skip: offset },
  })

  const values = (entities as Array<Record<string, string>>).map((e) => ({
    value: e[config.valueAttr],
    label: e[config.labelAttr],
  }))

  return res.json({
    values,
    count: metadata?.count ?? values.length,
    limit,
    offset,
  })
}
