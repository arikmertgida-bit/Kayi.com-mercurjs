import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { z } from "zod"
import { exportProducts, ExportFormat } from "../../../../lib/export/product-exporter.js"

const BodySchema = z.object({
  format: z.enum(["csv", "xlsx"]),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.errors.map((e) => e.message).join(", ")
    )
  }
  const { format } = parsed.data

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context?.actor_id,
    req.scope
  )
  if (!seller) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Seller not found")
  }

  // Fetch all seller products using knex + query API (same pattern as GET)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const productIds: string[] = await knex("product")
    .distinct("product.id")
    .innerJoin(
      "seller_seller_product_product as sp",
      "product.id",
      "sp.product_id"
    )
    .where({
      "sp.seller_id": seller.id,
      "sp.deleted_at": null,
      "product.deleted_at": null,
    })
    .pluck("product.id")

  let products: any[] = []
  if (productIds.length > 0) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "status",
        "handle",
        "thumbnail",
        "weight",
        "categories.id",
        "categories.name",
        "variants.id",
        "variants.sku",
        "variants.barcode",
        "variants.title",
        "variants.inventory_quantity",
        "variants.manage_inventory",
        "variants.allow_backorder",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.options.value",
        "images.url",
      ],
      filters: { id: productIds },
    })
    products = data
  }

  const { buffer, filename, contentType } = exportProducts(products, format as ExportFormat)

  res.setHeader("Content-Type", contentType)
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  res.setHeader("Content-Length", buffer.length)
  res.status(200).end(buffer)
}
