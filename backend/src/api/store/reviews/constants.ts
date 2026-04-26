/**
 * DEV_BYPASS constants — only active in non-production environments.
 * In production these are null so no request can match them.
 */
export const DEV_BYPASS_EMAIL =
  process.env.NODE_ENV !== "production" ? "cyclo@gmail.com" : null

export const DEV_BYPASS_ORDER_ID =
  process.env.NODE_ENV !== "production" ? "__dev_bypass_order__" : null
