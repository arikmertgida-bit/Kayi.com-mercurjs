"use client"

import { useEffect, useRef, useState } from "react"

interface CampaignCountdownProps {
  endsAt: string | Date | null
  startsAt?: string | Date | null
  /** compact: inline sayaç (ürün kartı/detay), full: banner (kampanya sayfası) */
  variant?: "compact" | "full"
}

function calcDiff(targetTs: number): number {
  return Math.max(0, Math.floor(targetTs - Date.now() / 1000))
}

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(h)}:${p(m)}:${p(s)}`
}

export function CampaignCountdown({
  endsAt,
  startsAt,
  variant = "compact",
}: CampaignCountdownProps) {
  const nowTs = Math.floor(Date.now() / 1000)
  const endTs = endsAt ? Math.floor(new Date(endsAt).getTime() / 1000) : 0
  const startTs = startsAt ? Math.floor(new Date(startsAt).getTime() / 1000) : 0

  const isUpcoming = startTs > 0 && nowTs < startTs
  const isActive = endTs > 0 && nowTs >= (startTs || 0) && nowTs < endTs
  const target = isUpcoming ? startTs : endTs

  const [diff, setDiff] = useState<number>(target ? calcDiff(target) : 0)
  const rafRef = useRef<number | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    if (!target) return

    const tick = () => {
      if (!activeRef.current) return
      const remaining = calcDiff(target)
      setDiff(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    const onVisibility = () => {
      activeRef.current = !document.hidden
      if (activeRef.current) rafRef.current = requestAnimationFrame(tick)
    }

    document.addEventListener("visibilitychange", onVisibility)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      activeRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [target])

  if (!isUpcoming && !isActive) return null
  if (diff <= 0) return null

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs font-bold rounded px-2 py-1 ${
          isUpcoming
            ? "bg-yellow-400 text-gray-900"
            : "bg-[#e30a17] text-white"
        }`}
      >
        <span>{isUpcoming ? "⏳" : "⏱️"}</span>
        <span className="font-mono tracking-wider">{formatHMS(diff)}</span>
      </div>
    )
  }

  // full variant — kampanya sayfası banner'ı
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-3 w-full ${
        isUpcoming
          ? "bg-yellow-400 text-gray-900"
          : "bg-[#003366] text-white border border-gray-700"
      }`}
    >
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
          {isUpcoming ? "Çok Yakında Başlıyor" : "İndirim Bitiyor"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#e30a17]">
          Özel Fırsatları Yakala
        </span>
      </div>
      <span
        className={`font-mono font-bold text-2xl tracking-widest ml-auto ${
          isUpcoming ? "text-gray-900" : "text-[#e30a17]"
        }`}
      >
        {formatHMS(diff)}
      </span>
    </div>
  )
}

