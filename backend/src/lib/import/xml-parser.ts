import { XMLParser } from "fast-xml-parser"
import { ImportedProduct, ParseResult, RowError } from "./types.js"
import { parsePriceToMinorUnits } from "./currency-converter.js"

/**
 * Parses XML product feeds in various common formats used by Turkish
 * dropshipping providers (Dropwizard, Ticimax, IdeaSoft, etc.).
 *
 * Supported root structures:
 *   <products><product>...</product></products>
 *   <catalog><items><item>...</item></items></catalog>
 *   <urunler><urun>...</urun></urunler>
 *   <feed><entry>...</entry></feed>  (Google Shopping-like)
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["product", "item", "urun", "entry", "variant"].includes(name),
  parseTagValue: true,
  trimValues: true,
})

function str(val: unknown): string {
  if (val === null || val === undefined) return ""
  return String(val).trim()
}

function toInt(val: unknown, defaultValue = 0): number {
  const n = parseInt(str(val), 10)
  return isNaN(n) ? defaultValue : n
}

function toStatus(val: unknown): "draft" | "published" {
  const v = str(val).toLowerCase()
  return v === "published" || v === "aktif" || v === "active" || v === "1" ? "published" : "draft"
}

/** Collect all image URLs from various XML patterns */
function collectImages(node: Record<string, unknown>): string[] {
  const images: string[] = []

  // Google Shopping / standard: <g:image_link>
  const direct = str(node["g:image_link"] ?? node["image_link"] ?? node["image"] ?? node["resim"] ?? node["gorsel"] ?? node["gorsel_url"])
  if (direct) images.push(direct)

  // <images><image>url</image></images>
  const imgBlock = node["images"] as any
  if (imgBlock) {
    const candidates = imgBlock["image"] ?? imgBlock["resim"] ?? imgBlock["gorsel"]
    if (Array.isArray(candidates)) {
      candidates.forEach((c: unknown) => { const u = str(c); if (u) images.push(u) })
    } else if (typeof candidates === "string" && candidates) {
      images.push(candidates)
    }
  }

  // thumbnail field
  const thumb = str(node["thumbnail"] ?? node["thumbnail_url"] ?? node["kucuk_resim"])
  if (thumb && !images.includes(thumb)) images.unshift(thumb)

  // Numbered fields: image1, image2 ...
  for (let i = 1; i <= 10; i++) {
    const u = str(node[`image${i}`] ?? node[`image_${i}`] ?? node[`resim${i}`])
    if (u && !images.includes(u)) images.push(u)
  }

  return images.filter(Boolean)
}

/** Find the item array regardless of root element name */
function findItems(parsed: Record<string, unknown>): unknown[] {
  // Common patterns
  const candidates: string[][] = [
    ["products", "product"],
    ["urunler", "urun"],
    ["catalog", "items", "item"],
    ["items", "item"],
    ["feed", "entry"],
    ["channel", "item"],
    ["root", "product"],
    ["data", "product"],
  ]

  for (const path of candidates) {
    let node: unknown = parsed
    for (const key of path) {
      if (node && typeof node === "object" && key in (node as object)) {
        node = (node as Record<string, unknown>)[key]
      } else {
        node = null
        break
      }
    }
    if (Array.isArray(node) && node.length > 0) return node
  }

  // Fallback: depth-first search for first array of objects
  function dfs(obj: unknown, depth = 0): unknown[] | null {
    if (depth > 4) return null
    if (!obj || typeof obj !== "object") return null
    for (const val of Object.values(obj as object)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val
      const found = dfs(val, depth + 1)
      if (found) return found
    }
    return null
  }

  return dfs(parsed) ?? []
}

export function parseXml(buffer: Buffer): ParseResult {
  const rows: ImportedProduct[] = []
  const errors: RowError[] = []

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(buffer.toString("utf-8")) as Record<string, unknown>
  } catch (err: any) {
    errors.push({ row: 0, message: `XML ayrıştırma hatası: ${err.message}` })
    return { rows, errors }
  }

  const items = findItems(parsed)
  if (items.length === 0) {
    errors.push({ row: 0, message: "XML dosyasında ürün bulunamadı. Desteklenen kök elementler: <products>, <urunler>, <catalog>, <feed>" })
    return { rows, errors }
  }

  items.forEach((item, idx) => {
    const rowNum = idx + 1
    try {
      const node = item as Record<string, unknown>

      const title = str(
        node["name"] ?? node["title"] ?? node["g:title"] ??
        node["product_name"] ?? node["urun_adi"] ?? node["baslik"] ?? node["ad"]
      )
      if (!title) {
        errors.push({ row: rowNum, message: "Ürün adı bulunamadı" })
        return
      }

      // Price: try various common field names
      const priceRaw = str(
        node["price"] ?? node["g:price"] ?? node["sale_price"] ?? node["fiyat"] ??
        node["satis_fiyati"] ?? node["liste_fiyati"] ?? node["price_try"] ?? node["price_usd"]
      )
      const currencyRaw = str(
        node["currency"] ?? node["para_birimi"] ?? node["currency_code"] ??
        node["@_currency"] ?? "TRY"
      )
      const currency = currencyRaw.toUpperCase() || "TRY"

      const images = collectImages(node)

      const sku = str(node["sku"] ?? node["stock_code"] ?? node["stok_kodu"] ?? node["id"] ?? node["product_id"])

      rows.push({
        title,
        description: str(node["description"] ?? node["g:description"] ?? node["aciklama"] ?? node["tanim"]) || undefined,
        status: toStatus(node["status"] ?? node["durum"] ?? node["active"]),
        category_name: str(node["category"] ?? node["g:product_type"] ?? node["kategori"] ?? node["category_name"]) || undefined,
        thumbnail: images[0],
        images,
        weight: toInt(node["weight"] ?? node["agirlik"]) || undefined,
        handle: str(node["handle"] ?? node["slug"]) || undefined,

        price_amount: parsePriceToMinorUnits(priceRaw, currency),
        currency,

        sku: sku || undefined,
        barcode: str(node["barcode"] ?? node["gtin"] ?? node["g:gtin"] ?? node["barkod"]) || undefined,
        stock: toInt(node["stock"] ?? node["quantity"] ?? node["stok"] ?? node["miktar"], 0),
        allow_backorder: false,
        manage_inventory: true,
        option_name: str(node["option_name"] ?? node["secenek_adi"]) || undefined,
        option_value: str(node["option_value"] ?? node["secenek_deger"]) || undefined,
        variant_title: str(node["variant_title"] ?? node["varyasyon"]) || undefined,

        _row: rowNum,
      })
    } catch (err: any) {
      errors.push({ row: rowNum, message: `Satır işleme hatası: ${err.message}` })
    }
  })

  return { rows, errors }
}
