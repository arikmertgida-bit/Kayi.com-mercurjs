import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, isPresent, QueryContext } from "@medusajs/framework/utils"
import b2cCustomerWishlistLink from "@mercurjs/b2c-core/links/customer-wishlist"

/**
 * GET /store/wishlist
 *
 * Overrides the @mercurjs/b2c-core default handler to return the wishlist in
 * the format the storefront expects:
 *   { wishlists: [{ id: string, products: StoreProduct[] }], count: number }
 *
 * b2c-core v1.5.3 changed the response shape to { products: [...] } which
 * dropped the wishlist ID — breaking the DELETE flow on the storefront.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Traverse: customer → customer_wishlist link → wishlist → products (IDs only)
  // Use same field pattern as b2c-core's own GET handler
  const { data: [linkRow] } = await query.graph({
    entity: (b2cCustomerWishlistLink as any).entryPoint,
    fields: ["wishlist.id", "wishlist.products.id"],
    filters: { customer_id: customerId },
  }) as any

  if (!linkRow) {
    return res.json({ wishlists: [], count: 0 })
  }

  const wishlistId: string = linkRow.wishlist?.id
  const productIds: string[] = (linkRow.wishlist?.products ?? []).map(
    (p: any) => p.id
  )

  if (productIds.length === 0) {
    return res.json({ wishlists: [{ id: wishlistId, products: [] }], count: 0 })
  }

  // Build pricing context (set by Medusa pricing middleware)
  let context: Record<string, any> = {}
  if (isPresent((req as any).pricingContext)) {
    const pricingContext = { ...(req as any).pricingContext, customer_id: customerId }
    context = {
      variants: {
        calculated_price: QueryContext(pricingContext),
      },
    }
  }

  const defaultFields = [
    "id",
    "title",
    "handle",
    "subtitle",
    "description",
    "thumbnail",
    "status",
    "variants.id",
    "variants.title",
    "variants.prices.amount",
    "variants.prices.currency_code",
    "variants.prices.price_set_id",
    "variants.calculated_price.calculated_amount",
    "variants.calculated_price.currency_code",
    "variants.calculated_price.original_amount",
  ]

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: (req as any).queryConfig?.fields ?? defaultFields,
    filters: { id: productIds },
    pagination: (req as any).queryConfig?.pagination,
    context,
  }) as any

  res.json({
    wishlists: [{ id: wishlistId, products }],
    count: metadata?.count ?? productIds.length,
  })
}
