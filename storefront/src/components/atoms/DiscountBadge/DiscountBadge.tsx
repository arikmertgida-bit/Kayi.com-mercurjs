interface DiscountBadgeProps {
  value: number
  type: "percentage" | "fixed" | string | null
}

export function DiscountBadge({ value, type }: DiscountBadgeProps) {
  const label =
    type === "percentage"
      ? `%${value} İNDİRİM`
      : type === "fixed"
        ? `${value}₺ İNDİRİM`
        : `${value} İNDİRİM`

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold leading-none">
      {label}
    </span>
  )
}
