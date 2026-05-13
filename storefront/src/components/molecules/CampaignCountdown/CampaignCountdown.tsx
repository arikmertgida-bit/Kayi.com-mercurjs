"use client"

import { useEffect, useState } from "react"

interface CampaignCountdownProps {
  endsAt: string | Date | null
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(endsAt: string | Date): TimeLeft | null {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function CampaignCountdown({ endsAt }: CampaignCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(
    endsAt ? calculateTimeLeft(endsAt) : null
  )

  useEffect(() => {
    if (!endsAt) return

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endsAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [endsAt])

  if (!endsAt || !timeLeft) return null

  const parts: string[] = []
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}g`)
  parts.push(`${timeLeft.hours}s`)
  parts.push(`${timeLeft.minutes}d`)
  parts.push(`${timeLeft.seconds}sn`)

  return (
    <p className="text-xs text-orange-600 font-medium">
      ⏱️ {parts.join(" ")} kaldı
    </p>
  )
}
