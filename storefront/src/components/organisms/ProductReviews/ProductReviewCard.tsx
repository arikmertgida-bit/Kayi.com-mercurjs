"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { StarRating } from "@/components/atoms"
import { Review, ReviewReply, reportReviewImage, getReviewReplies, createReviewReply, likeReviewReply, updateReviewReply, deleteReviewReply, isAuthenticated } from "@/lib/data/reviews"
import { likeReview } from "@/lib/data/review-likes"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

interface Props {
  review: Review
  currentCustomerId?: string
}

// ─── Report Modal ──────────────────────────────────────────────────────────────
const ReportModal = ({
  imageId,
  onClose,
  onReported,
}: {
  imageId: string
  onClose: () => void
  onReported: (imageId: string) => void
}) => {
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    setError(null)
    const result = await reportReviewImage(imageId, reason.trim())
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onReported(imageId)
    setSubmitted(true)
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
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
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
          <Image src={img.url} alt="Yorum fotoğrafı" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" />
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

// ─── Reply Card ────────────────────────────────────────────────────────────────
const ReplyCard = ({
  reply,
  onMention,
  currentCustomerId,
  onDeleted,
  onUpdated,
}: {
  reply: ReviewReply
  onMention: (name: string) => void
  currentCustomerId?: string
  onDeleted: (id: string) => void
  onUpdated: (id: string, content: string) => void
}) => {
  const [liked, setLiked] = useState(reply.is_liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(reply.likes_count ?? 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [authErr, setAuthErr] = useState(false)
  const [replyAuthErr, setReplyAuthErr] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(reply.content)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isOwn = !!currentCustomerId && reply.customer_id === currentCustomerId && !reply.is_seller_reply

  const name = `${reply.customer?.first_name ?? ""} ${reply.customer?.last_name ?? ""}`.trim() || "Kullanıcı"
  const initials = `${reply.customer?.first_name?.[0] ?? ""}${reply.customer?.last_name?.[0] ?? ""}`.toUpperCase() || "?"
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: tr }) }
    catch { return "" }
  })()

  const handleLike = async () => {
    if (likeLoading) return
    const wasLiked = liked
    const prevCount = likesCount
    setLiked(!liked)
    setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1)
    setLikeLoading(true)
    try {
      const res = await likeReviewReply(reply.id)
      if (res.error === "auth") {
        setLiked(wasLiked)
        setLikesCount(prevCount)
        setAuthErr(true)
        setTimeout(() => setAuthErr(false), 3000)
      } else if (res.error) {
        setLiked(wasLiked)
        setLikesCount(prevCount)
      } else {
        setLiked(res.liked)
        setLikesCount(res.likes_count)
      }
    } catch {
      setLiked(wasLiked)
      setLikesCount(prevCount)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleEditConfirm = async () => {
    const trimmed = editText.trim()
    if (!trimmed) return
    if (trimmed.length > 500) {
      setEditError("En fazla 500 karakter girilebilir.")
      return
    }
    setEditLoading(true)
    setEditError(null)
    const result = await updateReviewReply(reply.id, trimmed)
    setEditLoading(false)
    if (result.error) {
      setEditError(result.error)
      return
    }
    onUpdated(reply.id, trimmed)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    const result = await deleteReviewReply(reply.id)
    setDeleteLoading(false)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      onDeleted(reply.id)
    }
  }

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <Image
        src={reply.customer?.avatar_url ?? "/images/customer-default-avatar.jpg"}
        alt={name}
        width={28}
        height={28}
        unoptimized
        className="rounded-full size-7 object-cover border border-[#efbdd1] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-white/80 border border-[#f5d8e6] px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-primary">{name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-secondary">{timeAgo}</span>
              {isOwn && !isEditing && (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setEditText(reply.content) }}
                    className="text-[10px] text-secondary hover:text-[#8134af] transition-colors px-1"
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="text-[10px] text-secondary hover:text-red-500 transition-colors px-1 disabled:opacity-50"
                    title="Sil"
                  >
                    {deleteLoading ? "⏳" : "🗑️"}
                  </button>
                </>
              )}
            </div>
          </div>
          {isEditing ? (
            <>
              <textarea
                className="w-full border border-[#efbdd1] rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-[#dd2a7b] bg-white min-h-[56px] max-h-[120px]"
                value={editText}
                maxLength={500}
                onChange={(e) => { setEditText(e.target.value); setEditError(null) }}
                autoFocus
              />
              {editError && <p className="text-[10px] text-red-500 mt-0.5">{editError}</p>}
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={handleEditConfirm}
                  disabled={editLoading || !editText.trim()}
                  className="text-[10px] font-semibold text-white bg-[#dd2a7b] px-2.5 py-1 rounded-lg disabled:opacity-50 hover:bg-[#c13584] transition-colors"
                >
                  {editLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditError(null) }}
                  className="text-[10px] font-semibold text-secondary px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  İptal
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-primary/90 leading-relaxed whitespace-pre-line">{reply.content}</p>
          )}
        </div>
        {/* Reply like + mention row */}
        {!isEditing && (
          <div className="flex items-center gap-3 mt-1 pl-1">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                liked ? "text-[#dd2a7b]" : "text-secondary hover:text-[#dd2a7b]"
              }`}
            >
              <span className="text-xs">{liked ? "❤️" : "🤍"}</span>
              {likesCount > 0 ? likesCount : "Beğen"}
            </button>
            {authErr && <span className="text-[10px] text-red-400">Beğenmek için giriş yapmalısınız.</span>}
            <button
              onClick={async () => {
                const loggedIn = await isAuthenticated()
                if (!loggedIn) {
                  setReplyAuthErr(true)
                  setTimeout(() => setReplyAuthErr(false), 3000)
                  return
                }
                onMention(name)
              }}
              className="text-[10px] font-medium text-secondary hover:text-[#8134af] transition-colors"
            >
              Yanıtla
            </button>
            {replyAuthErr && <span className="text-[10px] text-red-400">Yanıtlamak için giriş yapmalısınız.</span>}
          </div>
        )}
        {deleteError && (
          <p className="text-[10px] text-red-500 mt-0.5 pl-1">{deleteError}</p>
        )}
      </div>
    </div>
  )
}

// ─── Seller Reply Card ─────────────────────────────────────────────────────────
const SellerReplyCard = ({
  sellerName,
  sellerPhoto,
  sellerHandle,
  note,
  onMention,
  replyId,
  initialLikes = 0,
  initialLikedByMe = false,
}: {
  sellerName: string
  sellerPhoto?: string
  sellerHandle: string
  note: string
  onMention: (name: string) => void
  replyId?: string
  initialLikes?: number
  initialLikedByMe?: boolean
}) => {
  const [liked, setLiked] = useState(initialLikedByMe)
  const [likesCount, setLikesCount] = useState(initialLikes)
  const [likeLoading, setLikeLoading] = useState(false)
  const [replyAuthErr, setReplyAuthErr] = useState(false)

  const initials = sellerName
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleLike = async () => {
    if (!replyId || likeLoading) return
    const wasLiked = liked
    const prevCount = likesCount
    setLiked(!liked)
    setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1)
    setLikeLoading(true)
    try {
      const res = await likeReviewReply(replyId)
      if (res.error) {
        setLiked(wasLiked)
        setLikesCount(prevCount)
      } else {
        setLiked(res.liked)
        setLikesCount(res.likes_count)
      }
    } catch {
      setLiked(wasLiked)
      setLikesCount(prevCount)
    } finally {
      setLikeLoading(false)
    }
  }

  return (
    <div className="flex gap-2.5 mb-1">
      {/* Seller logo */}
      <Link href={`/sellers/${sellerHandle}`} className="shrink-0 block">
        {sellerPhoto ? (
          <Image
            src={sellerPhoto}
            alt={sellerName}
            width={32}
            height={32}
            unoptimized
            className="rounded-lg size-8 object-cover border border-[#f5d8e6] hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#dd2a7b] to-[#8134af] flex items-center justify-center text-white text-[11px] font-bold">
            {initials}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-gradient-to-br from-[#fff1f8] to-[#fdf4ff] border border-[#e8c0d8] px-3 py-2 relative">
          {/* Badge */}
          <div className="absolute -top-2.5 left-3">
            <span className="bg-gradient-to-r from-[#dd2a7b] to-[#8134af] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide shadow-sm">
              🏪 Mağaza Yanıtı
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1 mb-1">
            <Link
              href={`/sellers/${sellerHandle}`}
              className="text-xs font-semibold text-[#8134af] hover:underline flex items-center gap-1"
            >
              {sellerName}
              {/* Arrow icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path fillRule="evenodd" clipRule="evenodd" d="M5.46967 8.46967C5.76256 8.17678 6.23744 8.17678 6.53033 8.46967L12 13.9393L17.4697 8.46967C17.7626 8.17678 18.2374 8.17678 18.5303 8.46967C18.8232 8.76256 18.8232 9.23744 18.5303 9.53033L12.5303 15.5303C12.2374 15.8232 11.7626 15.8232 11.4697 15.5303L5.46967 9.53033C5.17678 9.23744 5.17678 8.76256 5.46967 8.46967Z" fill="currentColor" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
              </svg>
            </Link>
          </div>
          <p className="text-xs text-primary/90 leading-relaxed whitespace-pre-line">{note}</p>
        </div>
        {/* Like + Reply row */}
        <div className="flex items-center gap-3 mt-1 pl-1">
          <button
            onClick={handleLike}
            disabled={likeLoading || !replyId}
            className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
              liked ? "text-[#dd2a7b]" : replyId ? "text-secondary hover:text-[#dd2a7b]" : "text-secondary/40 cursor-default"
            }`}
          >
            <span className="text-xs">{liked ? "❤️" : "🤍"}</span>
            {likesCount > 0 ? likesCount : "Beğen"}
          </button>
          <button
            onClick={async () => {
              const loggedIn = await isAuthenticated()
              if (!loggedIn) {
                setReplyAuthErr(true)
                setTimeout(() => setReplyAuthErr(false), 3000)
                return
              }
              onMention(sellerName)
            }}
            className="text-[10px] font-medium text-secondary hover:text-[#8134af] transition-colors"
          >
            Yanıtla
          </button>
          {replyAuthErr && <span className="text-[10px] text-red-400">Yanıtlamak için giriş yapmalısınız.</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Main Card ─────────────────────────────────────────────────────────────────
export const ProductReviewCard = ({ review, currentCustomerId }: Props) => {
  const [localImages, setLocalImages] = useState(review.images ?? [])
  const [reportingImageId, setReportingImageId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleImageReported = (imageId: string) => {
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId))
    setLightboxIndex(null)
  }
  const [liked, setLiked] = useState(review.is_liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(review.likes_count ?? 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  // Reply thread state
  const [replies, setReplies] = useState<ReviewReply[]>([])
  const [repliesLoaded, setRepliesLoaded] = useState(false)
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const handleReplyDeleted = (id: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== id))
  }

  const handleReplyUpdated = (id: string, content: string) => {
    setReplies((prev) => prev.map((r) => r.id === id ? { ...r, content } : r))
  }

  const customerName = review.customer
    ? `${review.customer.first_name} ${review.customer.last_name}`
    : "Anonim"

  const initials = review.customer
    ? `${review.customer.first_name?.[0] || ""}${review.customer.last_name?.[0] || ""}`.toUpperCase()
    : "?"

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: tr })
    } catch { return "" }
  })()

  const handleLike = async () => {
    if (likeLoading) return
    // Optimistic update
    const wasLiked = liked
    const prevCount = likesCount
    setLiked(!liked)
    setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1)
    setLikeLoading(true)
    try {
      const result = await likeReview(review.id)
      if (result.error === "auth") {
        setLiked(wasLiked)
        setLikesCount(prevCount)
        setLikeError("Beğenmek için giriş yapmalısınız.")
        setTimeout(() => setLikeError(null), 3000)
      } else if (result.error) {
        setLiked(wasLiked)
        setLikesCount(prevCount)
      } else {
        setLiked(result.liked)
        setLikesCount(result.likes_count)
      }
    } catch {
      setLiked(wasLiked)
      setLikesCount(prevCount)
    } finally {
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

  const handleReplyToggle = async () => {
    // Load replies on first open
    if (!repliesLoaded && !repliesLoading) {
      setRepliesLoading(true)
      try {
        const loaded = await getReviewReplies(review.id)
        setReplies(loaded)
        setRepliesLoaded(true)
      } catch { /* silent */ } finally {
        setRepliesLoading(false)
      }
    }
    setReplyOpen((prev) => !prev)
  }

  const handleReplySubmit = async () => {
    if (!replyText.trim() || replySubmitting) return
    setReplySubmitting(true)
    setReplyError(null)
    const result = await createReviewReply(review.id, replyText.trim())
    setReplySubmitting(false)
    if (result.error === "auth") {
      setReplyError("Yanıt yazmak için giriş yapmalısınız.")
      return
    }
    if (result.error) {
      setReplyError(result.error)
      return
    }
    if (result.reply) {
      setReplies((prev) => [...prev, result.reply!])
      setReplyText("")
    }
  }

  return (
    <>
      {reportingImageId && (
        <ReportModal imageId={reportingImageId} onClose={() => setReportingImageId(null)} onReported={handleImageReported} />
      )}
      {lightboxIndex !== null && localImages.length > 0 && (
        <PhotoLightbox
          images={localImages}
          startIndex={Math.min(lightboxIndex, localImages.length - 1)}
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
              unoptimized
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
        {localImages.length > 0 && (
          <div
            className={`flex gap-1.5 px-4 pb-3 flex-wrap`}
          >
            {localImages.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(index)}
                className="relative group overflow-hidden rounded-xl bg-[#f7f1f5] shrink-0"
                style={{ width: 64, height: 64 }}
              >
                <Image
                  src={img.url}
                  alt={`Yorum fotoğrafı ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Likes count + auth error */}
        {(likesCount > 0 || likeError) && (
          <div className="px-4 pb-2 flex items-center gap-3">
            {likesCount > 0 && (
              <span className="text-xs font-medium text-[#9f275f]">❤️ {likesCount} kişi beğendi</span>
            )}
            {likeError && (
              <span className="text-xs font-medium text-red-500">{likeError}</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="mx-4 border-t border-[#f5d8e6]" />

        {/* Action bar */}
        <div className="flex items-center px-2 py-1">
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              liked ? "text-[#dd2a7b] hover:bg-[#fff0f6] scale-105" : "text-secondary hover:bg-[#fff3f7] hover:text-[#c13584]"
            }`}
          >
            <span className={`text-base transition-transform duration-200 ${liked ? "scale-125" : "scale-100"}`}>
              {liked ? "❤️" : "🤍"}
            </span>
            <span>{liked && likesCount > 0 ? `Beğenildi (${likesCount})` : "Beğen"}</span>
          </button>

          <button
            onClick={handleReplyToggle}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              replyOpen ? "text-[#dd2a7b] bg-[#fff0f6]" : "text-secondary hover:bg-[#fff3f7] hover:text-[#c13584]"
            }`}
          >
            {repliesLoading ? (
              <span className="text-base animate-spin">⏳</span>
            ) : (
              <span className="text-base">💬</span>
            )}
            <span>
              {(() => {
                const hasSellerReply = replies.some((r) => r.is_seller_reply)
                const extraCount = review.seller_note && !hasSellerReply ? 1 : 0
                const total = replies.length + extraCount
                return total > 0 || review.seller_note ? `Yanıtlar (${total})` : "Yanıtla"
              })()}
            </span>
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

        {/* Reply thread */}
        {replyOpen && (
          <div className="border-t border-[#f5d8e6] bg-[#fff8fb]/60 px-4 py-3 space-y-3">
            {/* seller_note shown only when there are no is_seller_reply entries in thread */}
            {review.seller_note && !replies.some((r) => r.is_seller_reply) && (
              <SellerReplyCard
                sellerName={review.seller.name}
                sellerPhoto={
                  (
                    review.seller.members?.find(m => m.role === "owner" || m.role === "admin")
                    ?? review.seller.members?.[0]
                  )?.photo
                }
                sellerHandle={review.seller.handle}
                note={review.seller_note}
                onMention={(name) => {
                  const prefix = `@${name} `
                  setReplyText((prev) =>
                    prev.startsWith(prefix) ? prev : prefix + prev.replace(/^@\S+ /, "")
                  )
                }}
              />
            )}

            {/* All replies (customers and sellers) in chronological order */}
            {replies.length > 0 && (
              <div className="space-y-2.5">
                {replies.map((reply) =>
                  reply.is_seller_reply ? (
                    <SellerReplyCard
                      key={reply.id}
                      replyId={reply.id}
                      initialLikes={reply.likes_count ?? 0}
                      initialLikedByMe={reply.is_liked_by_me ?? false}
                      sellerName={reply.seller_name ?? review.seller.name}
                      sellerPhoto={
                        (
                          review.seller.members?.find(m => m.role === "owner" || m.role === "admin")
                          ?? review.seller.members?.[0]
                        )?.photo
                      }
                      sellerHandle={review.seller.handle}
                      note={reply.content}
                      onMention={(name) => {
                        const prefix = `@${name} `
                        setReplyText((prev) =>
                          prev.startsWith(prefix) ? prev : prefix + prev.replace(/^@\S+ /, "")
                        )
                      }}
                    />
                  ) : (
                    <ReplyCard
                      key={reply.id}
                      reply={reply}
                      currentCustomerId={currentCustomerId}
                      onDeleted={handleReplyDeleted}
                      onUpdated={handleReplyUpdated}
                      onMention={(name) => {
                        const prefix = `@${name} `
                        setReplyText((prev) =>
                          prev.startsWith(prefix) ? prev : prefix + prev.replace(/^@\S+ /, "")
                        )
                      }}
                    />
                  )
                )}
              </div>
            )}

            {replies.length === 0 && repliesLoaded && !review.seller_note && (
              <p className="text-xs text-secondary text-center py-1">Henüz yanıt yok. İlk yanıtı sen yaz!</p>
            )}

            {/* Reply input */}
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 border border-[#efbdd1] rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#dd2a7b] bg-white/90 placeholder:text-secondary/60 min-h-[36px] max-h-[80px]"
                placeholder="Yanıtınızı yazın... (max 500 karakter)"
                value={replyText}
                maxLength={500}
                rows={1}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleReplySubmit()
                  }
                }}
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || replySubmitting}
                className="shrink-0 rounded-xl bg-gradient-to-r from-[#dd2a7b] to-[#8134af] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {replySubmitting ? "..." : "Gönder"}
              </button>
            </div>

            {replyError && (
              <p className="text-xs text-red-500">{replyError}</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
