"use client"

import Image from "next/image"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { uploadCustomerFile, updateCustomerPhoto } from "@/lib/data/customer"

// ─── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_FORMATS = ["image/jpeg", "image/jpg", "image/png"]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const MIN_DIMENSIONS: Record<"avatar" | "cover", { width: number; height: number }> = {
  avatar: { width: 200,  height: 200  },
  cover:  { width: 1920, height: 400  },
}

// ─── Inline notification (replaces @medusajs/ui toast) ─────────────────────────
type NotifType = "success" | "error" | "warning" | "info"
interface Notification { type: NotifType; message: string }

const NOTIF_COLORS: Record<NotifType, string> = {
  success: "bg-green-500",
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
}
const NOTIF_ICONS: Record<NotifType, string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
}

function NotificationBar({
  notif,
  onClose,
}: {
  notif: Notification
  onClose: () => void
}) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-sm sm:max-w-md pointer-events-none">
      <div
        className={`${NOTIF_COLORS[notif.type]} text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 pointer-events-auto`}
        role="alert"
      >
        <span className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold leading-none">
          {NOTIF_ICONS[notif.type]}
        </span>
        <p className="flex-1 text-sm leading-snug">{notif.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors leading-none"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Görsel okunamadı.")) }
    img.src = url
  })
}

function validateFile(file: File): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_FORMATS.includes(file.type))
    return { valid: false, error: "Sadece JPG, JPEG ve PNG formatları desteklenir." }
  if (file.size > MAX_FILE_SIZE)
    return { valid: false, error: "Dosya boyutu 2 MB'ı geçemez." }
  return { valid: true }
}

// ─── Component ──────────────────────────────────────────────────────────────────
export const CustomerProfileHeader = ({
  user,
}: {
  user: HttpTypes.StoreCustomer
}) => {
  const meta = (user.metadata as Record<string, any>) || {}
  const router = useRouter()

  const [avatarUrl, setAvatarUrl] = useState<string>(
    meta.avatar_url || "/images/customer-default-avatar.jpg"
  )
  const [coverUrl, setCoverUrl] = useState<string>(
    meta.cover_url || "/images/customer-default-banner.jpeg"
  )
  const [isUploading, setIsUploading] = useState(false)
  const [notif, setNotif] = useState<Notification | null>(null)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef  = useRef<HTMLInputElement>(null)

  const showNotif = useCallback((type: NotifType, message: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current)
    setNotif({ type, message })
    notifTimer.current = setTimeout(() => setNotif(null), 4500)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => { if (notifTimer.current) clearTimeout(notifTimer.current) }, [])

  const handleUpload = async (file: File, type: "avatar" | "cover") => {
    const validation = validateFile(file)
    if (!validation.valid) { showNotif("error", validation.error); return }

    // Boyut uyarısı
    try {
      const dims = await getImageDimensions(file)
      const min = MIN_DIMENSIONS[type]
      if (dims.width < min.width || dims.height < min.height) {
        showNotif(
          "warning",
          `Görsel küçük (${dims.width}×${dims.height} px). En az ${min.width}×${min.height} px önerilir, aksi hâlde bulanık görünebilir.`
        )
        // uyarı göster ama yüklemeye devam et
        await new Promise(r => setTimeout(r, 300))
      }
    } catch { /* ignore */ }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      const url = await uploadCustomerFile(formData, type)
      if (!url) throw new Error("Dosya yüklenemedi. Lütfen tekrar deneyin.")
      await updateCustomerPhoto(type, url)
      const finalUrl = `${url}?t=${Date.now()}`
      if (type === "avatar") setAvatarUrl(finalUrl)
      else setCoverUrl(finalUrl)
      showNotif("success", "Fotoğraf başarıyla güncellendi.")
      router.refresh()
    } catch (err: unknown) {
      showNotif("error", err instanceof Error ? err.message : "Yükleme başarısız. Lütfen tekrar deneyin.")
    } finally {
      setIsUploading(false)
    }
  }

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "Kullanıcı"

  return (
    <div className="w-full overflow-x-hidden">
      {/* Inline notification */}
      {notif && <NotificationBar notif={notif} onClose={() => setNotif(null)} />}

      {/* Banner — sadece buton ile değiştirilebilir, tıklama overlay yok */}
      <div className="relative w-full overflow-hidden h-28 sm:h-40 md:h-52 lg:h-64 xl:h-[400px] rounded-[8px]">
        <Image
          src={coverUrl}
          alt="Profil kapak fotoğrafı"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />

        {/* Kapak değiştir butonu — sağ alt köşe */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => coverRef.current?.click()}
          className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 disabled:opacity-50 text-white rounded-full px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer z-10"
          title="Kapak Fotoğrafını Değiştir"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Kapak Fotoğrafını Değiştir</span>
        </button>
      </div>

      {/* Cover input */}
      <input
        ref={coverRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file, "cover")
          e.target.value = ""
        }}
      />

      {/* Avatar + Name row */}
      <div className="relative flex items-start px-4 md:px-8 -mt-8 md:-mt-12">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="relative rounded-full ring-4 ring-white overflow-hidden z-10 w-16 h-16 md:w-24 md:h-24">
            <Image
              src={avatarUrl}
              alt={fullName}
              fill
              sizes="(max-width: 768px) 64px, 96px"
              className="object-cover"
              priority
            />
          </div>

          {/* Avatar değiştir butonu — sağ alt köşe */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => avatarRef.current?.click()}
            className="absolute bottom-0 right-0 bg-black/60 hover:bg-black/80 disabled:opacity-50 text-white rounded-full p-1.5 border-2 border-white transition-colors z-20 cursor-pointer"
            title="Profil Fotoğrafını Değiştir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </button>

          <input
            ref={avatarRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file, "avatar")
              e.target.value = ""
            }}
          />
        </div>

        {/* İsim + Email */}
        <div className="mt-[38px] md:mt-[54px] ml-3.5">
          <span className="text-base md:text-lg font-semibold text-gray-900 leading-tight block">
            {fullName}
          </span>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>

        {/* Yükleniyor göstergesi */}
        {isUploading && (
          <div className="absolute top-2 right-4 text-xs text-gray-600 bg-white/90 px-3 py-1.5 rounded-full shadow-sm border">
            Yükleniyor…
          </div>
        )}
      </div>
    </div>
  )
}

