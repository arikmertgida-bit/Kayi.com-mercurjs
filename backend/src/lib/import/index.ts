import { parseCsv } from "./csv-parser.js"
import { parseExcel } from "./excel-parser.js"
import { parseXml } from "./xml-parser.js"
import { ParseResult } from "./types.js"

export type ImportFormat = "csv" | "xlsx" | "xml"

/**
 * Detects the file format from MIME type or filename extension.
 */
export function detectFormat(mimetype: string, originalname: string): ImportFormat | null {
  const mime = mimetype.toLowerCase()
  const ext = originalname.split(".").pop()?.toLowerCase() ?? ""

  if (
    mime === "text/csv" ||
    mime === "application/csv" ||
    mime === "application/vnd.ms-excel" && ext === "csv" ||
    ext === "csv" ||
    ext === "tsv"
  ) return "csv"

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) return "xlsx"

  if (
    mime === "text/xml" ||
    mime === "application/xml" ||
    mime === "application/rss+xml" ||
    ext === "xml"
  ) return "xml"

  return null
}

/**
 * Parse the uploaded file buffer into normalised ImportedProduct rows.
 */
export function parseFile(buffer: Buffer, format: ImportFormat): ParseResult {
  switch (format) {
    case "csv":  return parseCsv(buffer)
    case "xlsx": return parseExcel(buffer)
    case "xml":  return parseXml(buffer)
  }
}

export { ImportedProduct, ParseResult, RowError } from "./types.js"
