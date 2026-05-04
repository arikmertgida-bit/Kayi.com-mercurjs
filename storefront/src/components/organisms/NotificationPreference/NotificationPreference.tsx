"use client"
import { useState, useTransition } from "react"
import { updateNotificationPreference, updateGlobalNotificationPreference } from "@/lib/data/customer"

interface Props {
  initialValue: boolean
  initialGlobalValue: boolean
}

// Reusable toggle row
function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b last:border-b-0">
      <div>
        <p className="label-md">{label}</p>
        <p className="text-sm text-secondary mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

export const NotificationPreference = ({ initialValue, initialGlobalValue }: Props) => {
  const [replyEnabled, setReplyEnabled] = useState(initialValue)
  const [globalEnabled, setGlobalEnabled] = useState(initialGlobalValue)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isReplyPending, startReplyTransition] = useTransition()
  const [isGlobalPending, startGlobalTransition] = useTransition()

  const handleReplyChange = (next: boolean) => {
    setReplyEnabled(next)
    setReplyError(null)
    startReplyTransition(async () => {
      try {
        await updateNotificationPreference(next)
      } catch {
        setReplyEnabled(!next)
        setReplyError("Tercih kaydedilemedi. Lütfen tekrar deneyin.")
      }
    })
  }

  const handleGlobalChange = (next: boolean) => {
    setGlobalEnabled(next)
    setGlobalError(null)
    startGlobalTransition(async () => {
      try {
        await updateGlobalNotificationPreference(next)
      } catch {
        setGlobalEnabled(!next)
        setGlobalError("Tercih kaydedilemedi. Lütfen tekrar deneyin.")
      }
    })
  }

  return (
    <div className="mt-6 border rounded-sm p-6">
      <h2 className="heading-md uppercase mb-4">Bildirim Tercihleri</h2>
      <ToggleRow
        label="Bildirim Seslerini ve Uyarıları Aç/Kapat"
        description="Yeni mesaj ve etkinlik bildirimlerini tarayıcı push bildirimleri olarak alın."
        checked={globalEnabled}
        disabled={isGlobalPending}
        onChange={handleGlobalChange}
      />
      {globalError && <p className="text-sm text-red-500 mt-1 mb-2">{globalError}</p>}
      <ToggleRow
        label="Yorum Yanıtı Bildirimleri"
        description="Satıcılar yorumlarınıza yanıt verdiğinde bildirim alın."
        checked={replyEnabled}
        disabled={isReplyPending}
        onChange={handleReplyChange}
      />
      {replyError && <p className="text-sm text-red-500 mt-1">{replyError}</p>}
    </div>
  )
}
