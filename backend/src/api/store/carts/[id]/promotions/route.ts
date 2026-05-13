import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionActions } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import sellerProduct from "@mercurjs/b2c-core/links/seller-product"
import { PromotionWithMeta } from "../../../../vendor/shared/promotion-types.js"

/** Expected request body for POST /store/carts/:id/promotions */
interface PostBody {
  promo_codes: string[]
}

/** Shape of a single promotion in the response */
interface PromotionResponseItem {
  id: string
  display_code: string | null
  type: string | null | undefined
  status: string | null | undefined
}

/** Shape of a cart row returned by query.graph */
type CartItemRow = {
  id: string
  items?: Array<{
    id: string
    variant?: { product_id?: string | null } | null
  }>
}

/** Shape of a row from the seller_product link table */
type SellerProductLinkRow = {
  seller_id: string
  product_id: string
}

/**
 * POST /store/carts/:id/promotions
 *
 * Accepts vendor-facing coupon codes (e.g. "SUMMER20") and resolves them
 * to their namespaced DB counterparts ("KAYI-sel_xxx-SUMMER20") before
 * delegating to updateCartPromotionsWorkflow.
 *
 * Resolution logic:
 * 1. Fetch cart line items → extract product IDs
 * 2. Look up seller IDs via the seller_product link table
 * 3. For each input code, try exact namespaced match per seller (KAYI-{sellerId}-{CODE})
 * 4. Fall back to platform-level exact match if no seller match found
 *
 * This eliminates the ILIKE `%-CODE` pattern which:
 *   - prevents B-tree index usage (full table scan on 100K+ promotions)
 *   - allows cross-seller coupon resolution (Seller B's budget drained for Seller A's items)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: cartId } = req.params
  const logger = req.scope.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>("logger")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  const body = req.body as PostBody
  if (!Array.isArray(body.promo_codes) || body.promo_codes.length === 0) {
    return res.status(400).json({
      message: "promo_codes array is required and must not be empty.",
    })
  }

  // Normalize every input code to uppercase for case-insensitive matching
  const inputCodes = body.promo_codes.map((c) => String(c).toUpperCase())

  // Step 1: Fetch cart items with their product IDs
  const { data: cartRows } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.variant.product_id"],
    filters: { id: cartId },
  })

  const cart = (cartRows as CartItemRow[])[0]
  const productIds: string[] = []
  if (cart?.items) {
    for (const item of cart.items) {
      const pid = item.variant?.product_id
      if (pid && !productIds.includes(pid)) {
        productIds.push(pid)
      }
    }
  }

  // Step 2: Resolve seller IDs from the seller_product link table
  const sellerIds = new Set<string>()
  if (productIds.length > 0) {
    const { data: spLinks } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ["seller_id", "product_id"],
      filters: { product_id: productIds, deleted_at: { $eq: null } },
    })
    for (const row of spLinks as SellerProductLinkRow[]) {
      if (row.seller_id) sellerIds.add(row.seller_id)
    }
  }

  // Step 3: For each input code, try seller-namespaced exact match, then platform fallback.
  // Exact match allows B-tree index usage on the `code` column — no ILIKE, no full table scan.
  const matchResults = await Promise.all(
    inputCodes.map(async (inputCode): Promise<PromotionWithMeta | null> => {
      // Try each seller: KAYI-{sellerId}-{CODE}
      for (const sellerId of sellerIds) {
        const namespacedCode = `KAYI-${sellerId}-${inputCode}`
        const results = (await promotionService.listPromotions(
          { code: namespacedCode, status: ["active"] },
          { take: 1 }
        )) as PromotionWithMeta[]
        if (results[0]) return results[0]
      }

      // Platform-level fallback: exact match without namespace
      // (applies to platform-wide promotions that have no seller_id in metadata)
      const fallback = (await promotionService.listPromotions(
        { code: inputCode, status: ["active"] },
        { take: 1 }
      )) as PromotionWithMeta[]
      return fallback[0] ?? null
    })
  )

  const matched = matchResults.filter((p): p is PromotionWithMeta => p !== null)

  // Approval gate: reject promotions that are pending or rejected.
  // Platform promotions (no metadata.approval_status) pass through unconditionally.
  // Vendor promotions require explicit "approved" status.
  const approved = matched.filter((p) => {
    const status = p.metadata?.approval_status
    if (status === "pending" || status === "rejected") return false
    return true
  })

  // Cross-vendor contamination guard: vendor promotions (those with a seller_id in
  // metadata) must only apply when that seller's products are actually in the cart.
  // A vendor with target_rules=[] (applies to all) must NOT affect a different
  // seller's products and drain their budget.
  // Platform promotions (no seller_id) bypass this check.
  const isolated = approved.filter((p) => {
    const promoSellerId =
      typeof p.metadata?.seller_id === "string" ? p.metadata.seller_id : null
    if (!promoSellerId) return true // platform promotion — always allow
    if (sellerIds.has(promoSellerId)) return true // this seller's products are in cart
    logger.warn(
      `[store/carts/promotions] Rejected promotion ${p.id} — seller ${promoSellerId} has no products in cart ${cartId}`
    )
    return false
  })

  if (isolated.length === 0) {
    logger.warn(
      `[store/carts/promotions] No approved promotions matched for codes: ${inputCodes.join(", ")}`
    )
    return res.status(404).json({
      message: "Girilen kupon kodları bulunamadı veya henüz onaylanmamış.",
    })
  }

  const resolvedCodes = isolated.map((p) => p.code).filter((c): c is string => Boolean(c))

  // Apply resolved codes to the cart via the core workflow
  await updateCartPromotionsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      promo_codes: resolvedCodes,
      action: PromotionActions.ADD,
    },
  })

  // Build response — strip the namespace prefix so display_code is user-friendly
  const promotions: PromotionResponseItem[] = isolated.map((p) => {
    const sellerId =
      typeof p.metadata?.seller_id === "string" ? p.metadata.seller_id : null

    let displayCode: string | null = null
    if (p.code) {
      if (sellerId) {
        const prefix = `KAYI-${sellerId}-`
        displayCode = p.code.startsWith(prefix) ? p.code.slice(prefix.length) : p.code
      } else {
        displayCode = p.code
      }
    }

    return {
      id: p.id,
      display_code: displayCode,
      type: p.type,
      status: p.status,
    }
  })

  logger.info(
    `[store/carts/promotions] Applied ${promotions.length} promotion(s) to cart ${cartId} (${approved.length - isolated.length} rejected — seller not in cart)`
  )

  return res.json({ promotions })
}
