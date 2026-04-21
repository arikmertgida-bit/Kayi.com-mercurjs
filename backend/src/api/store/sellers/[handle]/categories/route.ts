import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/sellers/:handle/categories
 * Returns unique categories of products belonging to this seller
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { handle } = req.params

  const seller = await knex("seller")
    .select("id")
    .where({ handle, deleted_at: null })
    .first()

  if (!seller) {
    return res.status(404).json({ message: "Seller not found" })
  }

  const rows = await knex("product_category")
    .select("product_category.id", "product_category.name", "product_category.handle")
    .join(
      "product_category_product",
      "product_category.id",
      "product_category_product.product_category_id"
    )
    .join("product", "product.id", "product_category_product.product_id")
    .join(
      "seller_seller_product_product",
      "product.id",
      "seller_seller_product_product.product_id"
    )
    .where({
      "seller_seller_product_product.seller_id": seller.id,
      "seller_seller_product_product.deleted_at": null,
      "product.deleted_at": null,
      "product.status": "published",
    })
    .whereNull("product_category.deleted_at")
    .distinct("product_category.id")

  return res.json({ categories: rows })
}
