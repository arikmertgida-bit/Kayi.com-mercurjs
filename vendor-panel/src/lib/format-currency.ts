export const formatCurrency = (amount: number, currency: string) => {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    signDisplay: "auto",
  }).format(amount)

  if (currency.toUpperCase() === "TRY") {
    return formatted.replace(/^([+-]?)\s*(TRY|TL)\s*/i, "$1₺")
      .replace(/\s*(TRY|TL)\s*$/i, "₺")
  }

  return formatted
}
