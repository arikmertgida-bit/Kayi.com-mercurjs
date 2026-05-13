interface BudgetProgressBarProps {
  remainingPct: number | null
}

export function BudgetProgressBar({ remainingPct }: BudgetProgressBarProps) {
  if (remainingPct === null || remainingPct > 50) return null

  const isLow = remainingPct <= 20
  const barColor = isLow ? "bg-red-500" : "bg-orange-400"
  const trackColor = isLow ? "bg-red-100" : "bg-orange-100"
  const label = isLow ? "Tükeniyor!" : "Sınırlı stok!"
  const labelColor = isLow ? "text-red-600" : "text-orange-600"

  return (
    <div className="flex flex-col gap-1">
      <div className={`w-full rounded-full h-1.5 ${trackColor}`}>
        <div
          className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(remainingPct, 2)}%` }}
        />
      </div>
      <p className={`text-xs font-semibold ${labelColor}`}>{label}</p>
    </div>
  )
}
