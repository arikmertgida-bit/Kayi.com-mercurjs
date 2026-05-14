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

  // Preserve raw codes for logging; resolution logic below handles both
  // full namespaced codes (KAYI-sel_xxx-CODE) and short user codes (CODE).
  const rawCodes = body.promo_codes.map((c) => String(c).trim())

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

  // Step 3: For each input code, collect ALL matching promotions across all sellers.
  // - Full namespaced code (KAYI-sel_xxx-CODE): matched directly, no uppercase transform
  //   (seller ID segment is case-sensitive in the DB).
  // - Short code (CODE): uppercased, tried against every seller whose products are in
  //   the cart so that a code shared by multiple sellers applies to each independently.
  const matchResults = await Promise.all(
    rawCodes.map(async (rawCode): Promise<PromotionWithMeta[]> => {
      // Customer pasted a full namespaced code → direct exact match
      if (/^KAYI-/i.test(rawCode)) {
        const direct = (await promotionService.listPromotions(
          { code: rawCode, status: ["active"] },
          { take: 1 }
        )) as PromotionWithMeta[]
        return direct[0] ? [direct[0]] : []
      }

      // Short code: uppercase, then scan ALL sellers in cart (collect every match)
      const upperCode = rawCode.toUpperCase()
      const found: PromotionWithMeta[] = []
      for (const sellerId of sellerIds) {
        const namespacedCode = `KAYI-${sellerId}-${upperCode}`
        const results = (await promotionService.listPromotions(
          { code: namespacedCode, status: ["active"] },
          { take: 1 }
        )) as PromotionWithMeta[]
        if (results[0]) found.push(results[0])
      }
      if (found.length > 0) return found

      // Platform-level fallback: exact match without namespace
      const fallback = (await promotionService.listPromotions(
        { code: upperCode, status: ["active"] },
        { take: 1 }
      )) as PromotionWithMeta[]
      return fallback[0] ? [fallback[0]] : []
    })
  )

  const matched = matchResults.flat().filter((p): p is PromotionWithMeta => p !== null)

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
      `[store/carts/promotions] No approved promotions matched for codes: ${rawCodes.join(", ")}`
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
