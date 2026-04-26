/**
 * DEV_BYPASS constants — controlled via environment variables.
 *
 * Localhost / test ortamında:
 *   DEV_REVIEW_BYPASS_EMAIL=cyclo@gmail.com
 *   DEV_REVIEW_BYPASS_ORDER_ID=__dev_bypass_order__
 *
 * Production'a geçerken .env'den bu iki satırı silerek bypass'u kapat.
 */
export const DEV_BYPASS_EMAIL: string | null =
  process.env.DEV_REVIEW_BYPASS_EMAIL ?? null

export const DEV_BYPASS_ORDER_ID: string | null =
  process.env.DEV_REVIEW_BYPASS_ORDER_ID ?? null
