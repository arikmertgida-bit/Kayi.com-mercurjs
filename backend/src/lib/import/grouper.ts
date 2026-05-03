/**
 * Groups flat ImportedProduct rows (one row = one variant) into
 * GroupedProduct records (one record = one product with N variants).
 *
 * Grouping key: model_code → falls back to product title.
 * This matches Trendyol/HepsiBurada product hierarchy:
 *   - model_code  = product identity
 *   - barcode/sku = variant identity
 */
import { ImportedProduct } from "./types.js"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupedVariant {
  sku?: string
  barcode?: string
  stock: number
  price_amount: number
  currency: string
  option_value?: string
  variant_title?: string
  allow_backorder: boolean
  manage_inventory: boolean
  _row: number
}

export interface GroupedProduct {
  model_code: string      // the grouping key used (model_code or title)
  title: string
  description?: string
  status: "draft" | "published"
  category_name?: string
  thumbnail?: string
  images: string[]
  weight?: number
  handle?: string
  option_name?: string    // e.g. "Renk", "Beden"
  variants: GroupedVariant[]
}

// ── Grouper ───────────────────────────────────────────────────────────────────

/**
 * Groups rows by model_code (or title as fallback).
 * Rows with the same key become variants of one product.
 * Product-level fields (title, description, thumbnail, images) are taken from
 * the first row of each group; subsequent rows can contribute missing fields.
 */
export function groupByModelCode(rows: ImportedProduct[]): GroupedProduct[] {
  const groups = new Map<string, GroupedProduct>()

  for (const row of rows) {
    // Use model_code if present, otherwise fall back to title
    const key = (row.model_code?.trim() || row.title?.trim() || `row_${row._row}`)

    if (!groups.has(key)) {
      groups.set(key, {
        model_code: key,
        title: row.title,
        description: row.description,
        status: row.status,
        category_name: row.category_name,
        thumbnail: row.thumbnail,
        images: [...(row.images ?? [])],
        weight: row.weight,
        handle: row.handle,
        option_name: row.option_name,
        variants: [],
      })
    }

    const group = groups.get(key)!

    // Fill in product-level fields from later rows if the first row was missing them
    if (!group.description && row.description) group.description = row.description
    if (!group.thumbnail && row.thumbnail) {
      group.thumbnail = row.thumbnail
      if (!group.images.includes(row.thumbnail)) group.images.unshift(row.thumbnail)
    }
    if (!group.option_name && row.option_name) group.option_name = row.option_name
    // Collect additional images from each row
    for (const img of row.images ?? []) {
      if (!group.images.includes(img)) group.images.push(img)
    }

    group.variants.push({
      sku: row.sku,
      barcode: row.barcode,
      stock: row.stock,
      price_amount: row.price_amount,
      currency: row.currency,
      option_value: row.option_value,
      variant_title: row.variant_title,
      allow_backorder: row.allow_backorder,
      manage_inventory: row.manage_inventory,
      _row: row._row,
    })
  }

  return Array.from(groups.values())
}
