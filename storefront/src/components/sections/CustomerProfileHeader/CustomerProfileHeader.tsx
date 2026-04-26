"use client"

import Image from "next/image"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { toast } from "@medusajs/ui"
import { uploadCustomerFile, updateCustomerPhoto } from "@/lib/data/customer"

const AVATAR = 96
const HALF = AVATAR / 2

const ALLOWED_FORMATS = ["image/jpeg", "image/jpg", "image/png"]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const UPLOAD_HINTS: Record<"avatar" | "cover", string> = {
  avatar: "1:1 oran önerilir (kare) • Maks. 2MB • JPG, JPEG, PNG",
  cover: "İdeal boyut: 1920×400 px • Maks. 2MB • JPG, JPEG, PNG",
}

function validateFile(
  file: File,
  type: "avatar" | "cover"
): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return { valid: false, error: "Sadece JPG, JPEG ve PNG formatları desteklenir." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Dosya boyutu 2MB'ı geçemez." }
  }
  return { valid: true }
}

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

  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File, type: "avatar" | "cover") => {
    const validation = validateFile(file, type)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    toast.info(UPLOAD_HINTS[type])

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      const url = await uploadCustomerFile(formData)
      if (!url) throw new Error("Dosya yüklenemedi. Lütfen tekrar deneyin.")
      await updateCustomerPhoto(type, url)
      // Cache busting: sayfayı yenileyince tarayıcı eski görseli göstermesin
      const finalUrl = `${url}?t=${Date.now()}`
      if (type === "avatar") setAvatarUrl(finalUrl)
      else setCoverUrl(finalUrl)
      toast.success("Fotoğraf başarıyla güncellendi.")
      router.refresh()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Yükleme başarısız. Lütfen tekrar deneyin."
      toast.error(message)
      // State değişmez — mevcut görsel korunur
    } finally {
      setIsUploading(false)
    }
  }

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "Kullanıcı"

  return (
    <div className="w-full overflow-x-hidden">
      {/* Banner — tamamı tıklanabilir, responsive yükseklik */}
      <div
        className="relative w-full overflow-hidden cursor-pointer h-28 sm:h-40 md:h-52 lg:h-64 xl:h-[400px] rounded-[8px]"
        onClick={() => !isUploading && coverRef.current?.click()}
        title={UPLOAD_HINTS.cover}
      >
        <Image
          src={coverUrl}
          alt="Profil kapak fotoğrafı"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" />

        {/* Kamera ikonu — görsel, pointer-events-none */}
        <div
          className="absolute bottom-3 right-3 bg-black/50 text-white rounded-full px-3 py-2 flex items-center gap-2 text-sm font-medium pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 flex-shrink-0"
          >
            <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
            <path
              fillRule="evenodd"
              d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden sm:inline">Kapak Fotoğrafını Değiştir</span>
        </div>
      </div>

      {/* Cover input — banner dışında */}
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
      <div
        className="relative flex items-start px-4 md:px-8"
        style={{ marginTop: -HALF }}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="relative rounded-full ring-4 ring-white shadow-xl overflow-hidden z-10"
            style={{ width: AVATAR, height: AVATAR }}
          >
            <Image
              src={avatarUrl}
              alt={fullName}
              fill
              sizes="200px"
              className="object-cover"
              priority
            />
          </div>

          {/* Avatar edit button — sağ alt köşe */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => avatarRef.current?.click()}
            className="absolute bottom-0 right-0 bg-black/50 hover:bg-black/70 disabled:opacity-50 text-white rounded-full p-1.5 border-2 border-white transition-colors z-20"
            title={UPLOAD_HINTS.avatar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path
                fillRule="evenodd"
                d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
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

        {/* İsim + Email — avatarın sağında */}
        <div style={{ marginTop: HALF + 6, marginLeft: 14 }}>
          <span className="text-base md:text-lg font-semibold text-gray-900 leading-tight block">
            {fullName}
          </span>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>

        {/* Loading indicator */}
        {isUploading && (
          <div className="absolute top-2 right-4 text-xs text-gray-600 bg-white/90 px-3 py-1.5 rounded-full shadow-sm border">
            Yükleniyor...
          </div>
        )}
      </div>
    </div>
  )
}
