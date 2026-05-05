import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  if (!currency_code || isEmpty(currency_code)) {
    return amount.toString()
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount)

  if (currency_code.toUpperCase() === "TRY") {
    return formatted
      .replace(/^([+-]?)\s*(TRY|TL)\s*/i, "$1₺ ")
      .replace(/\s*(TRY|TL)\s*$/i, "₺")
  }

  return formatted
}
