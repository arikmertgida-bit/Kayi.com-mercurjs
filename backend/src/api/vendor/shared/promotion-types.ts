import {
  CampaignDTO,
  FilterableCampaignProps,
  FilterablePromotionProps,
  PromotionDTO,
} from "@medusajs/types"

/**
 * Adds a `metadata` field to any DTO or filter type that doesn't declare it.
 * MedusaJS v2 persists and filters `metadata` as JSONB at runtime, but the
 * published @medusajs/types interfaces intentionally omit it.
 * Using an intersection (not `as any`) preserves all other type information.
 */
export type WithMetadata<T> = T & { metadata: Record<string, unknown> }

/** Filter type for seller-scoped campaign list queries. */
export type SellerCampaignFilter = WithMetadata<FilterableCampaignProps>

/** Filter type for seller-scoped promotion list queries. */
export type SellerPromotionFilter = WithMetadata<FilterablePromotionProps>

/**
 * MedusaJS v2 stores `metadata` as JSONB on promotions and campaigns at
 * runtime, but @medusajs/types DTO interfaces do not declare this field.
 * These intersection types give type-safe access to fields we control,
 * without erasing any other type information (unlike `as any`).
 */
export type PromotionWithMeta = WithMetadata<PromotionDTO>

export type CampaignWithMeta = WithMetadata<CampaignDTO>

/**
 * Extracts `seller_id` from a metadata object with runtime validation.
 * Returns `undefined` if metadata is not a plain object or seller_id
 * is not a string — ensuring corrupted data fails the ownership check.
 */
function extractSellerId(meta: Record<string, unknown> | undefined | null): string | undefined {
  if (meta == null) return undefined
  const raw = meta["seller_id"]
  return typeof raw === "string" ? raw : undefined
}

/**
 * Returns true if the promotion belongs to the given seller, false otherwise.
 * Performs runtime validation: corrupted or missing metadata also returns false.
 * Routes should respond with res.status(403) when this returns false.
 */
export function sellerOwnsPromotion(
  promotion: PromotionWithMeta,
  sellerId: string
): boolean {
  return extractSellerId(promotion.metadata) === sellerId
}

/**
 * Returns true if the campaign belongs to the given seller, false otherwise.
 * Performs runtime validation: corrupted or missing metadata also returns false.
 * Routes should respond with res.status(403) when this returns false.
 */
export function sellerOwnsCampaign(
  campaign: CampaignWithMeta,
  sellerId: string
): boolean {
  return extractSellerId(campaign.metadata) === sellerId
}

/**
 * Merges incoming metadata with a mandatory seller_id field.
 * Uses runtime typeof guard instead of a cast to verify the input shape.
 */
export function buildMetaWithSeller(
  incoming: unknown,
  sellerId: string
): Record<string, unknown> {
  const base =
    typeof incoming === "object" && incoming !== null
      ? (incoming as Record<string, unknown>)
      : {}
  return { ...base, seller_id: sellerId }
}
