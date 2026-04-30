/**
 * Normalised row that all parsers (CSV / Excel / XML) produce.
 * All parsers converge to this type before any DB operation.
 */
export interface ImportedProduct {
  // Product-level fields
  title: string
  description?: string
  status: "draft" | "published"
  category_name?: string       // used for manual category mapping step
  thumbnail?: string           // URL
  images: string[]             // URLs
  weight?: number
  handle?: string              // optional; auto-generated from title if absent

  // Pricing
  price_amount: number         // always in minor units (kuruş for TRY)
  currency: string             // original currency code (TRY, USD, EUR …)

  // Variant-level fields
  sku?: string
  barcode?: string
  stock: number
  allow_backorder: boolean
  manage_inventory: boolean
  option_name?: string
  option_value?: string
  variant_title?: string
  variant_weight?: number

  // Row metadata (for error reporting)
  _row: number
}

export interface ParseResult {
  rows: ImportedProduct[]
  errors: RowError[]
}

export interface RowError {
  row: number
  sku?: string
  message: string
}
