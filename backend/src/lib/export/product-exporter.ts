import * as XLSX from "xlsx"

export type ExportFormat = "csv" | "xlsx"

interface ExportProduct {
  id: string
  title: string
  description?: string
  status: string
  handle?: string
  thumbnail?: string
  weight?: number
  categories?: { name: string }[]
  variants?: {
    sku?: string
    barcode?: string
    title?: string
    prices?: { amount: number; currency_code: string }[]
    inventory_quantity?: number
    manage_inventory?: boolean
    allow_backorder?: boolean
    options?: { value: string }[]
  }[]
  images?: { url: string }[]
}

interface ExportRow {
  "Product Id": string
  "Product Title": string
  "Product Description": string
  "Product Status": string
  "Product Handle": string
  "Product Thumbnail": string
  "Product Weight": string
  "Product Category": string
  "Variant SKU": string
  "Variant Barcode": string
  "Variant Title": string
  "Price TRY": string
  "Stock": string
  "Manage Inventory": string
  "Allow Backorder": string
  "Option Name": string
  "Option Value": string
  "Image 1 Url": string
  "Image 2 Url": string
  "Image 3 Url": string
}

function buildRows(products: ExportProduct[]): ExportRow[] {
  const rows: ExportRow[] = []

  for (const p of products) {
    const category = p.categories?.[0]?.name ?? ""
    const images = p.images?.map((i) => i.url) ?? []
    if (p.thumbnail && !images.includes(p.thumbnail)) images.unshift(p.thumbnail)

    const variants = p.variants ?? [{}]

    for (const v of variants) {
      const tryPrice = v.prices?.find((pr) => pr.currency_code === "try")
      const priceTry = tryPrice ? (tryPrice.amount / 100).toFixed(2) : ""

      const optionValue = v.options?.[0]?.value ?? ""

      rows.push({
        "Product Id": p.id,
        "Product Title": p.title,
        "Product Description": p.description ?? "",
        "Product Status": p.status,
        "Product Handle": p.handle ?? "",
        "Product Thumbnail": p.thumbnail ?? "",
        "Product Weight": p.weight != null ? String(p.weight) : "",
        "Product Category": category,
        "Variant SKU": v.sku ?? "",
        "Variant Barcode": v.barcode ?? "",
        "Variant Title": v.title ?? "",
        "Price TRY": priceTry,
        "Stock": v.inventory_quantity != null ? String(v.inventory_quantity) : "",
        "Manage Inventory": v.manage_inventory !== false ? "true" : "false",
        "Allow Backorder": v.allow_backorder ? "true" : "false",
        "Option Name": v.options?.length ? "Seçenek" : "",
        "Option Value": optionValue,
        "Image 1 Url": images[0] ?? "",
        "Image 2 Url": images[1] ?? "",
        "Image 3 Url": images[2] ?? "",
      })
    }
  }

  return rows
}

/**
 * Generate a CSV or XLSX buffer from a list of seller products.
 * Returns { buffer, filename, contentType }
 */
export function exportProducts(
  products: ExportProduct[],
  format: ExportFormat
): { buffer: Buffer; filename: string; contentType: string } {
  const rows = buildRows(products)

  if (format === "csv") {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Products")
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" })
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `products-export-${Date.now()}.csv`,
      contentType: "text/csv; charset=utf-8",
    }
  }

  // xlsx
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 18),
  }))
  ws["!cols"] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, "Products")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer

  return {
    buffer: buf,
    filename: `products-export-${Date.now()}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}
