import {
  CampaignDTO,
  PromotionDTO,
} from "@medusajs/types"
import { SellerDTO } from "@mercurjs/framework"

/**
 * Adds a `metadata` field to any DTO or filter type that doesn't declare it.
 * MedusaJS v2 persists and filters `metadata` as JSONB at runtime, but the
 * published @medusajs/types interfaces intentionally omit it.
 * Using an intersection (not `as any`) preserves all other type information.
 */
export type WithMetadata<T> = T & { metadata: Record<string, unknown> }

/**
 * SellerDTO augmented with a `metadata` field.
 * MercurJS seller entities store metadata as JSONB at runtime; the
 * published SellerDTO intentionally omits this field.
 * Request `["id", "metadata"]` as extra fields when calling
 * fetchSellerByAuthActorId to populate this at runtime.
 */
export type SellerWithMeta = SellerDTO & { metadata?: Record<string, unknown> | null }

/**
 * MedusaJS v2 stores `metadata` as JSONB on promotions and campaigns at
 * runtime, but @medusajs/types DTO interfaces do not declare this field.
 * These intersection types give type-safe access to fields we control,
 * without erasing any other type information (unlike `as any`).
 */
export type PromotionWithMeta = WithMetadata<PromotionDTO>

export type CampaignWithMeta = WithMetadata<CampaignDTO>

/**
 * Satıcı kodunu platform namespace'iyle birleştirir.
 * DB'ye her zaman "KAYI-{sellerId}-{CODE}" formatında yazılır.
 * Görüntüleme için display_code ayrıca döndürülür.
 * Büyük harf + tire/rakam/harf dışındaki karakterler temizlenir.
 */
export function buildNamespacedCode(rawCode: string, sellerId: string): string {
  const clean = rawCode.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
  return `KAYI-${sellerId}-${clean}`
}

/**
 * Namespace prefix'ini soyarak orijinal kodu döndürür.
 * API response'larda display_code olarak kullan.
 */
export function stripNamespaceFromCode(namespacedCode: string, sellerId: string): string {
  const prefix = `KAYI-${sellerId}-`
  return namespacedCode.startsWith(prefix)
    ? namespacedCode.slice(prefix.length)
    : namespacedCode
}

/**
 * Satıcı kampanya tanımlayıcısını platform namespace'iyle birleştirir.
 * DB'ye "KAYI-{sellerId}-{IDENTIFIER}" formatında yazılır.
 * Alfanümerik olmayan karakterler (tire ve alt çizgi hariç) temizlenir.
 */
export function buildNamespacedIdentifier(raw: string, sellerId: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
  return `KAYI-${sellerId}-${clean}`
}

/**
 * Namespace prefix'ini soyarak orijinal identifier'ı döndürür.
 */
export function stripNamespaceFromIdentifier(namespaced: string, sellerId: string): string {
  const prefix = `KAYI-${sellerId}-`
  return namespaced.startsWith(prefix) ? namespaced.slice(prefix.length) : namespaced
}

/**
 * Merges incoming metadata with mandatory seller ownership and scope fields.
 * Uses runtime typeof guard instead of a cast to verify the input shape.
 *
 * @param incoming   - Raw metadata from the request body (unknown shape).
 * @param sellerId   - Authenticated seller's ID.
 * @param sellerMeta - Optional seller-level metadata (e.g. from query.graph).
 *                     When `auto_publish_promotions` is `true`, the new promotion
 *                     is immediately approved; otherwise it starts as "pending".
 */
export function buildMetaWithSeller(
  incoming: unknown,
  sellerId: string,
  sellerMeta?: Record<string, unknown> | null
): Record<string, unknown> {
  const base =
    typeof incoming === "object" && incoming !== null
      ? (incoming as Record<string, unknown>)
      : {}
  const autoPublish = sellerMeta?.auto_publish_promotions === true
  const approvalStatus = autoPublish ? "approved" : "pending"
  // trust_level mirrors the seller's current trust tier and is written on every
  // promotion/campaign so that downstream filters can act without re-querying the seller.
  const trustLevel = typeof sellerMeta?.trust_level === "string" ? sellerMeta.trust_level : "standard"
  return {
    ...base,
    seller_id: sellerId,
    promotion_scope: "seller",   // platform kuponları admin tarafından "platform" ile oluşturur
    financed_by: "seller",       // ileride "platform" | "split" desteklenecek
    approval_status: approvalStatus,
    trust_level: trustLevel,
  }
}
