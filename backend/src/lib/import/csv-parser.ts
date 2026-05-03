import { parse } from "csv-parse/sync"
import { ImportedProduct, ParseResult, RowError } from "./types.js"
import { parsePriceToMinorUnits } from "./currency-converter.js"

/**
 * Expected CSV column names (case-insensitive, trimmed).
 * Both semicolon and comma delimiters are supported.
 */
const BOOL_TRUE = new Set(["true", "1", "yes", "evet"])

function toBool(val: string | undefined, defaultValue = false): boolean {
  if (!val) return defaultValue
  return BOOL_TRUE.has(val.trim().toLowerCase())
}

function toInt(val: string | undefined, defaultValue = 0): number {
  const n = parseInt((val || "").trim(), 10)
  return isNaN(n) ? defaultValue : n
}

function toStatus(val: string | undefined): "draft" | "published" {
  const v = (val || "").trim().toLowerCase()
  return v === "published" ? "published" : "draft"
}

/**
 * Detects delimiter by scanning the header line.
 */
function detectDelimiter(raw: string): ";" | "," {
  const firstLine = raw.split("\n")[0] ?? ""
  const semis = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semis >= commas ? ";" : ","
}

/**
 * Normalise a header key: lowercase, trim, replace spaces with underscores.
 */
function normaliseKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_")
}

export function parseCsv(buffer: Buffer): ParseResult {
  const rows: ImportedProduct[] = []
  const errors: RowError[] = []

  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "") // strip BOM
  const delimiter = detectDelimiter(text)

  let records: Record<string, string>[]
  try {
    records = parse(text, {
      delimiter,
      columns: (header: string[]) => header.map(normaliseKey),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[]
  } catch (err: any) {
    errors.push({ row: 0, message: `CSV ayrıştırma hatası: ${err.message}` })
    return { rows, errors }
  }

  records.forEach((rec, idx) => {
    const rowNum = idx + 2 // 1-indexed + header row
    try {
      // Detect currency from headers (Price TRY / Price USD / Price EUR …)
      let currency = "TRY"
      let priceRaw = ""
      for (const key of Object.keys(rec)) {
        const m = key.match(/^price[_\s]?([a-z]{3})$/i)
        if (m) {
          currency = m[1].toUpperCase()
          priceRaw = rec[key] ?? ""
          break
        }
      }
      // Fallback keys
      if (!priceRaw) priceRaw = rec["price"] ?? rec["fiyat"] ?? ""

      const title = (rec["product_title"] ?? rec["title"] ?? rec["urun_adi"] ?? "").trim()
      if (!title) {
        errors.push({ row: rowNum, sku: rec["variant_sku"] ?? rec["sku"], message: "Ürün adı boş olamaz" })
        return
      }

      // Model code: grouping key that ties multiple rows into a single product
      const model_code = (
        rec["model_kodu"] ??
        rec["model_code"] ??
        rec["model_no"] ??
        rec["urun_kodu"] ??
        rec["ürün_kodu"] ??
        rec["urun_kod"] ??
        rec["product_code"] ??
        rec["model"] ??
        ""
      ).trim() || undefined

      // Collect image URLs
      const images: string[] = []
      for (let i = 1; i <= 10; i++) {
        const url = rec[`image_${i}_url`] ?? rec[`image${i}_url`] ?? rec[`image_${i}`]
        if (url?.trim()) images.push(url.trim())
      }
      if (rec["product_thumbnail"]?.trim()) images.unshift(rec["product_thumbnail"].trim())

      rows.push({
        model_code,
        title,
        description: rec["product_description"] ?? rec["description"] ?? rec["aciklama"],
        status: toStatus(rec["product_status"] ?? rec["status"] ?? rec["durum"]),
        category_name: (rec["product_category"] ?? rec["category"] ?? rec["kategori"] ?? "").trim() || undefined,
        thumbnail: images[0],
        images,
        weight: toInt(rec["product_weight"] ?? rec["variant_weight"] ?? rec["agirlik"]) || undefined,
        handle: (rec["product_handle"] ?? rec["handle"] ?? "").trim() || undefined,

        price_amount: parsePriceToMinorUnits(priceRaw, currency),
        currency,

        sku: (rec["variant_sku"] ?? rec["sku"] ?? "").trim() || undefined,
        barcode: (rec["variant_barcode"] ?? rec["barcode"] ?? "").trim() || undefined,
        stock: toInt(rec["variant_inventory_quantity"] ?? rec["stock"] ?? rec["stok"]),
        allow_backorder: toBool(rec["variant_allow_backorder"] ?? rec["allow_backorder"]),
        manage_inventory: toBool(rec["variant_manage_inventory"] ?? rec["manage_inventory"], true),
        option_name: (rec["option_1_name"] ?? rec["option_name"] ?? "").trim() || undefined,
        option_value: (rec["option_1_value"] ?? rec["option_value"] ?? "").trim() || undefined,
        variant_title: (rec["variant_title"] ?? "").trim() || undefined,

        _row: rowNum,
      })
    } catch (err: any) {
      errors.push({ row: rowNum, message: `Satır işleme hatası: ${err.message}` })
    }
  })

  return { rows, errors }
}
