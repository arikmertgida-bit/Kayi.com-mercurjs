/**
 * Benzersiz buyuk harfli SKU uretir.
 * Format: VND-XXXXXXXX (8 karakter buyuk harf ve rakam)
 * Ornek: VND-A3F7K2PQ
 */
export const generateSku = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "VND-"
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

/**
 * Model Kodu + Renk + Beden kombinasyonundan SKU uretir.
 * Ornek: TY88231-SIYAH-42
 */
export const generateVariantSku = (
  modelCode: string,
  color: string,
  size: string
): string => {
  const normalize = (str: string) =>
    str.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 12)
  const m = normalize(modelCode || "VND")
  const c = normalize(color || "")
  const s = normalize(size || "")
  return [m, c, s].filter(Boolean).join("-")
}
