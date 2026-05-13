"use client"

import { useState } from "react"

interface PromotionStripProps {
  displayCode: string
  scope: string
}

export function PromotionStrip({ displayCode, scope }: PromotionStripProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const subLabel =
    scope === "seller"
      ? "Satıcı kuponu • Sepette geçerli"
      : "Platform kuponu • Sepette geçerli"

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">
          🏷️ {displayCode}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {copied ? "Kopyalandı ✓" : "Kopyala"}
        </button>
      </div>
      <p className="text-xs text-gray-500">{subLabel}</p>
    </div>
  )
}
