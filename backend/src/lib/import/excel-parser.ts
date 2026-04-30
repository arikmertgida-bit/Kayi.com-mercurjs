import * as XLSX from "xlsx"
import { ImportedProduct, ParseResult, RowError } from "./types.js"
import { parsePriceToMinorUnits } from "./currency-converter.js"

const BOOL_TRUE = new Set(["true", "1", "yes", "evet", "doğru"])

function toBool(val: unknown, defaultValue = false): boolean {
  if (val === null || val === undefined) return defaultValue
  return BOOL_TRUE.has(String(val).trim().toLowerCase())
}

function toInt(val: unknown, defaultValue = 0): number {
  const n = parseInt(String(val ?? ""), 10)
  return isNaN(n) ? defaultValue : n
}

function toStatus(val: unknown): "draft" | "published" {
  const v = String(val ?? "").trim().toLowerCase()
  return v === "published" ? "published" : "draft"
}

function normaliseKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_")
}

export function parseExcel(buffer: Buffer): ParseResult {
  const rows: ImportedProduct[] = []
  const errors: RowError[] = []

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  } catch (err: any) {
    errors.push({ row: 0, message: `Excel dosyası okunamadı: ${err.message}` })
    return { rows, errors }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    errors.push({ row: 0, message: "Excel dosyasında sayfa (sheet) bulunamadı" })
    return { rows, errors }
  }

  const sheet = workbook.Sheets[sheetName]
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false, // convert numbers/booleans to strings for uniform processing
  })

  // Normalise column keys
  const normRecords = records.map((rec) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      out[normaliseKey(k)] = String(v ?? "")
    }
    return out
  })

  normRecords.forEach((rec, idx) => {
    const rowNum = idx + 2
    try {
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
      if (!priceRaw) priceRaw = rec["price"] ?? rec["fiyat"] ?? ""

      const title = (rec["product_title"] ?? rec["title"] ?? rec["urun_adi"] ?? "").trim()
      if (!title) {
        errors.push({ row: rowNum, sku: rec["variant_sku"] ?? rec["sku"], message: "Ürün adı boş olamaz" })
        return
      }

      const images: string[] = []
      for (let i = 1; i <= 10; i++) {
        const url = rec[`image_${i}_url`] ?? rec[`image${i}_url`] ?? rec[`image_${i}`]
        if (url?.trim()) images.push(url.trim())
      }
      if (rec["product_thumbnail"]?.trim()) images.unshift(rec["product_thumbnail"].trim())

      rows.push({
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
