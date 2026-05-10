/**
 * Merkezi satıcı görsel yönetimi.
 *
 * Zincir: member.photo → seller.photo → default-seller-avatar.png
 *
 * Kural:
 * - Tüm satıcı avatar hesaplamalarında bu fonksiyonlar kullanılır.
 * - Bileşen seviyesinde next/image width/height/sizes sorumluluğu kalır.
 * - null/undefined durumunda her zaman geçerli bir string döner (LCP/CLS güvenli).
 */

import type { SellerMember } from "@/types/seller"

export const DEFAULT_SELLER_AVATAR =
  "/images/vendor/default-seller-avatar.png" as const

export const DEFAULT_STORE_BANNER =
  "/images/vendor/default-store-banner.jpeg" as const

export interface VendorImageSource {
  memberPhoto?: string | null
  sellerPhoto?: string | null
}

/**
 * Satıcı avatar URL'sini çözümler.
 * Zincir: memberPhoto → sellerPhoto → DEFAULT_SELLER_AVATAR
 *
 * @returns Her zaman decode edilmiş, geçerli bir string döner.
 */
export function getVendorImage(src: VendorImageSource): string {
  const raw = src.memberPhoto ?? src.sellerPhoto ?? null

  if (!raw) return DEFAULT_SELLER_AVATAR

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Satıcı üyelerinden owner/admin önceliğiyle birini seçer.
 * Öncelik: role === "owner" → role === "admin" → members[0]
 *
 * @returns Bulunan member veya null (üye yoksa).
 */
export function resolveOwnerMember<T extends Pick<SellerMember, "role"> & { photo?: string | null }>(
  members?: T[] | null
): T | null {
  if (!members || members.length === 0) return null

  return (
    members.find((m) => m.role === "owner") ??
    members.find((m) => m.role === "admin") ??
    members[0]
  )
}
