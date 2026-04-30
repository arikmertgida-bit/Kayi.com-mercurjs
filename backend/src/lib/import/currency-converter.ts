/**
 * Static exchange rates to TRY.
 * Used when a vendor imports products priced in a foreign currency.
 * Phase 2: replace with a live exchange-rate API (TCMB / Fixer.io).
 */
const RATES_TO_TRY: Record<string, number> = {
  TRY: 1,
  USD: 38.5,
  EUR: 41.5,
  GBP: 48.5,
  JPY: 0.26,
  CHF: 43.0,
  CNY: 5.3,
  RUB: 0.42,
}

/**
 * Convert an amount in `fromCurrency` to TRY minor units (kuruş).
 * Input `amount` is expected to already be in minor units for the source
 * currency (e.g. cents for USD). If the currency is unknown we return
 * the amount unchanged and log a warning.
 *
 * @param amount       Amount in minor units of `fromCurrency`
 * @param fromCurrency ISO 4217 currency code (case-insensitive)
 * @returns Amount in TRY minor units (kuruş), rounded to integer
 */
export function convertToTry(amount: number, fromCurrency: string): number {
  const code = (fromCurrency || "TRY").toUpperCase()
  const rate = RATES_TO_TRY[code]
  if (rate === undefined) {
    // Unknown currency — return as-is; caller should warn
    return Math.round(amount)
  }
  return Math.round(amount * rate)
}

/**
 * Parse a price string from various formats and return minor units.
 * Handles: "1.299,90", "1299.90", "1299", "1,299.90"
 */
export function parsePriceToMinorUnits(raw: string, currency: string): number {
  if (!raw) return 0

  // Determine if the string uses comma as decimal separator (Turkish: "1.299,90")
  // or period as decimal separator (US: "1299.90")
  let normalized = raw.trim().replace(/[^\d.,]/g, "")

  // If both comma and period exist, the last one is the decimal separator
  const lastComma = normalized.lastIndexOf(",")
  const lastPeriod = normalized.lastIndexOf(".")

  if (lastComma > lastPeriod) {
    // Turkish format: "1.299,90" → remove periods, replace comma with period
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (lastPeriod > lastComma) {
    // US format: "1,299.90" → remove commas
    normalized = normalized.replace(/,/g, "")
  } else {
    // Only one separator or none
    normalized = normalized.replace(",", ".")
  }

  const float = parseFloat(normalized)
  if (isNaN(float)) return 0

  // Convert to minor units (×100)
  const minorUnits = Math.round(float * 100)
  return convertToTry(minorUnits, currency)
}
