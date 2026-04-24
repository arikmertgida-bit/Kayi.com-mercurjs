"use client"
import { useState } from "react"
import Image from "next/image"
import { StarRating } from "@/components/atoms"
import { Review, reportReviewImage } from "@/lib/data/reviews"
import { likeReview } from "@/lib/data/review-likes"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

interface Props {
  review: Review
}

// ─── Report Modal ──────────────────────────────────────────────────────────────
const ReportModal = ({
  imageId,
  onClose,
}: {
  imageId: string
  onClose: () => void
}) => {
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    await reportReviewImage(imageId, reason)
    setSubmitted(true)
    setLoading(false)
    setTimeout(onClose, 1800)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-base text-primary">Görseli Bildir</h3>
        {submitted ? (
          <p className="text-sm text-green-600 py-4 text-center">
            ✓ Bildiriminiz alındı. Görsel incelemeye alındı.
          </p>
        ) : (
          <>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 focus:outline-none focus:border-primary resize-none"
              placeholder="Bu görseli neden bildiriyorsunuz?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || loading}
                className="text-sm px-4 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {loading ? "Gönderiliyor..." : "Bildir"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Photo Lightbox ────────────────────────────────────────────────────────────
const PhotoLightbox = ({
  images,
  startIndex,
  onClose,
  onReport,
}: {
  images: NonNullable<Review["images"]>
  startIndex: number
  onClose: () => void
  onReport: (id: string) => void
}) => {
  const [current, setCurrent] = useState(startIndex)
  const img = images[current]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-2xl hover:opacity-70"
        >
          ✕
        </button>
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
          <Image src={img.url} alt="Yorum fotoğrafı" fill className="object-contain" />
        </div>
        {images.length > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="text-white disabled:opacity-30 text-xl px-3 hover:opacity-70"
            >‹</button>
            <span className="text-white text-sm">{current + 1} / {images.length}</span>
            <button
              onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
              className="text-white disabled:opacity-30 text-xl px-3 hover:opacity-70"
            >›</button>
          </div>
        )}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => { onReport(img.id); onClose() }}
            className="text-red-400 text-xs hover:text-red-300 transition-colors"
          >
            🚩 Bu görseli bildir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Card ─────────────────────────────────────────────────────────────────
export const ProductReviewCard = ({ review }: Props) => {
  const [reportingImageId, setReportingImageId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [liked, setLiked] = useState(review.is_liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(review.likes_count ?? 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  const customerName = review.customer
    ? `${review.customer.first_name} ${review.customer.last_name}`
    : "Anonim"

  const initials = review.customer
    ? `${review.customer.first_name?.[0] || ""}${review.customer.last_name?.[0] || ""}`.toUpperCase()
    : "?"

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: tr })
    } catch { return "" }
  })()

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    try {
      const result = await likeReview(review.id)
      setLiked(result.liked)
      setLikesCount(result.likes_count)
    } catch { /* silent */ } finally {
      setLikeLoading(false)
    }
  }

  const handleWhatsAppShare = () => {
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating)
    const text = [
      `🛍️ Ürün Yorumu`,
      `👤 ${customerName}`,
      `${stars} (${review.rating}/5)`,
      review.customer_note ? `💬 "${review.customer_note}"` : "",
      `🔗 ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].filter(Boolean).join("\n")
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
    setShareMsg("WhatsApp açılıyor...")
    setTimeout(() => setShareMsg(null), 2000)
  }

  const handleComment = () => {
    document.getElementById("write-review-section")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      {reportingImageId && (
        <ReportModal imageId={reportingImageId} onClose={() => setReportingImageId(null)} />
      )}
      {lightboxIndex !== null && review.images && (
        <PhotoLightbox
          images={review.images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onReport={(id) => setReportingImageId(id)}
        />
      )}

      <div className="overflow-hidden rounded-[22px] border border-white/70 bg-gradient-to-br from-[#fff8fb] via-white to-[#fff1e8] shadow-[0_18px_50px_rgba(225,48,108,0.10)] transition-shadow hover:shadow-[0_22px_60px_rgba(245,133,41,0.14)]">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          {review.customer?.avatar_url ? (
            <Image
              src={review.customer.avatar_url}
              alt={customerName}
              width={44}
              height={44}
              className="rounded-full size-11 object-cover border-2 border-base-primary shrink-0"
            />
          ) : (
            <div className="size-11 rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-primary text-sm leading-tight">{customerName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating starSize={12} rate={review.rating} />
                  <span className="text-xs text-secondary/80">{review.rating}.0</span>
                </div>
              </div>
              <span className="text-xs text-secondary shrink-0">{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Review text */}
        {review.customer_note && (
          <div className="px-4 pb-3">
            <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
              {review.customer_note}
            </p>
          </div>
        )}

        {/* Photos grid — click to open lightbox */}
        {review.images && review.images.length > 0 && (
          <div
            className={`grid gap-1 px-4 pb-3 ${
              review.images.length === 1 ? "grid-cols-1" :
              review.images.length === 2 ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {review.images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(index)}
                className="relative group aspect-square overflow-hidden rounded-2xl bg-[#f7f1f5]"
              >
                <Image
                  src={img.url}
                  alt={`Yorum fotoğrafı ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Likes count */}
        {likesCount > 0 && (
          <div className="px-4 pb-2">
            <span className="text-xs font-medium text-[#9f275f]">❤️ {likesCount} kişi beğendi</span>
          </div>
        )}

        {/* Divider */}
        <div className="mx-4 border-t border-[#f5d8e6]" />

        {/* Action bar */}
        <div className="flex items-center px-2 py-1">
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              liked ? "text-[#dd2a7b] hover:bg-[#fff0f6]" : "text-secondary hover:bg-[#fff3f7] hover:text-[#c13584]"
            }`}
          >
            <span className="text-base">{liked ? "❤️" : "🤍"}</span>
            <span>Beğen</span>
          </button>

          <button
            onClick={handleComment}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-secondary transition-colors hover:bg-[#fff3f7] hover:text-[#c13584]"
          >
            <span className="text-base">💬</span>
            <span>Yorum</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-secondary transition-colors hover:bg-[#fff7f0] hover:text-[#f77737]"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>{shareMsg ?? "Paylaş"}</span>
          </button>
        </div>
      </div>
    </>
  )
}
