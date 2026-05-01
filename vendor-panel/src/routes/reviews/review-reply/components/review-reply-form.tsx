import { useRef, useState } from "react"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { Button, Heading, Textarea, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useReview, useUpdateReview, useReviewReplies, useCreateReviewReply, useUpdateVendorReviewReply, useDeleteVendorReviewReply } from "../../../../hooks/api/review"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export const ReviewReplyForm = () => {
  const { handleSuccess } = useRouteModal()
  const { id } = useParams()

  const { review } = useReview(id!)
  const images: Array<{ id: string; url: string }> = review?.images ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Reply thread state
  const { replies, refetch: refetchReplies } = useReviewReplies(id!)
  const [replyText, setReplyText] = useState("")
  const [replyError, setReplyError] = useState<string | null>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const { mutateAsync: createReply, isPending: isReplying } = useCreateReviewReply(id!)

  const { mutateAsync: updateReview, isPending: isDeleting } = useUpdateReview(id!)

  const handleDeleteNote = async () => {
    await updateReview(
      { seller_note: "" },
      {
        onSuccess: () => {
          toast.success("Reply has been deleted")
          handleSuccess(`/reviews/${id}`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  const handleSendReply = async () => {
    const content = replyText.trim()
    if (!content) return
    if (content.length > 500) {
      setReplyError("Yanıt en fazla 500 karakter olabilir.")
      return
    }
    setReplyError(null)
    try {
      await createReply({ content })
      setReplyText("")
      refetchReplies()
      toast.success("Yanıt gönderildi")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Yanıt gönderilemedi"
      toast.error(message)
    }
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{review.seller_note ? "Edit Reply" : "Reply"}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description>
          {review.seller_note
            ? "Edit your reply to customer review."
            : "Reply to customer review."}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Body>
          {/* Customer photo gallery */}
          {images.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-ui-fg-subtle mb-2">
                Müşteri Fotoğrafları ({images.length})
              </p>
              <div
                className={`grid gap-2 ${
                  images.length === 1
                    ? "grid-cols-1"
                    : images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
              >
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="relative aspect-square overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle hover:opacity-90 transition-opacity group"
                  >
                    <img
                      src={img.url}
                      alt={`Yorum fotoğrafı ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-lg transition-opacity">🔍</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightboxIndex !== null && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setLightboxIndex(null)}
            >
              <div
                className="relative max-w-xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="absolute -top-10 right-0 text-white text-2xl hover:opacity-70 font-bold"
                >
                  ✕
                </button>
                <img
                  src={images[lightboxIndex]?.url}
                  alt="Büyük görünüm"
                  className="w-full rounded-xl object-contain max-h-[70vh]"
                />
                {images.length > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
                      disabled={lightboxIndex === 0}
                      className="text-white disabled:opacity-30 text-2xl px-3 hover:opacity-70"
                    >
                      ‹
                    </button>
                    <span className="text-white text-sm">
                      {lightboxIndex + 1} / {images.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((i) => Math.min(images.length - 1, (i ?? 0) + 1))}
                      disabled={lightboxIndex === images.length - 1}
                      className="text-white disabled:opacity-30 text-2xl px-3 hover:opacity-70"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Customer & Seller Replies Thread ─── */}
          <div className="mt-5 border-t border-ui-border-base pt-4">
            <p className="text-xs font-semibold text-ui-fg-base mb-3 flex items-center gap-1.5">
              <span>💬</span>
              Müşteri Yanıtları
              {replies.length > 0 && (
                <span className="ml-1 bg-ui-bg-base-pressed text-ui-fg-subtle text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  {replies.length}
                </span>
              )}
            </p>

            {replies.length === 0 ? (
              <p className="text-xs text-ui-fg-muted italic py-2">Henüz yanıt yok.</p>
            ) : (
              <div className="space-y-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
                {replies.map((reply: any) =>
                  reply.is_seller_reply ? (
                    <SellerReplyItem
                      key={reply.id}
                      reply={reply}
                      reviewId={id!}
                      onMutated={refetchReplies}
                    />
                  ) : (
                    <div
                      key={reply.id}
                      className="flex gap-2 text-xs"
                    >
                      <div className="size-6 rounded-full bg-ui-bg-base-pressed flex items-center justify-center text-[10px] font-bold text-ui-fg-subtle shrink-0">
                        {reply.customer
                          ? `${reply.customer.first_name?.[0] ?? ""}${reply.customer.last_name?.[0] ?? ""}`.toUpperCase() || "K"
                          : "K"}
                      </div>
                      <div className="max-w-[80%]">
                        <div className="rounded-xl px-3 py-1.5 bg-ui-bg-base border border-ui-border-base rounded-tl-none">
                          <p className="font-medium mb-0.5 text-[10px] opacity-80">
                            {reply.customer
                              ? `${reply.customer.first_name} ${reply.customer.last_name}`.trim() || "Müşteri"
                              : "Müşteri"}
                          </p>
                          <p className="leading-snug whitespace-pre-line">{reply.content}</p>
                        </div>
                        <p className="text-[9px] text-ui-fg-muted mt-0.5 px-1">
                          {formatDate(reply.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Seller quick reply textarea */}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={replyTextareaRef}
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value)
                  setReplyError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                placeholder="Müşteriye yanıt yaz... (Enter ile gönder)"
                className="flex-1 min-h-[60px] text-xs resize-none"
                autoComplete="off"
              />
              <Button
                type="button"
                size="small"
                onClick={handleSendReply}
                isLoading={isReplying}
                disabled={!replyText.trim()}
                className="shrink-0 mb-0.5"
              >
                Gönder
              </Button>
            </div>
            {replyError && (
              <p className="text-xs text-ui-fg-error mt-1">{replyError}</p>
            )}
          </div>
        </RouteDrawer.Body>
      <RouteDrawer.Footer>
        {review?.seller_note && (
          <Button
            className="px-6"
            variant="secondary"
            onClick={handleDeleteNote}
            isLoading={isDeleting}
          >
            Delete reply
          </Button>
        )}
        <Button
          variant="secondary"
          className="px-6"
          onClick={() => handleSuccess(`/reviews/${id}`)}
        >
          Kapat
        </Button>
      </RouteDrawer.Footer>
    </RouteDrawer>
  )
}

// ─── Seller Reply Item with inline edit/delete ─────────────────────────────────
const SellerReplyItem = ({
  reply,
  reviewId,
  onMutated,
}: {
  reply: any
  reviewId: string
  onMutated: () => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(reply.content)
  const [editError, setEditError] = useState<string | null>(null)

  const { mutateAsync: updateReply, isPending: isUpdating } = useUpdateVendorReviewReply(reviewId, reply.id)
  const { mutateAsync: deleteReply, isPending: isDeleting } = useDeleteVendorReviewReply(reviewId, reply.id)

  const handleSaveEdit = async () => {
    const content = editText.trim()
    if (!content || content.length > 500) {
      setEditError("Yanıt boş olamaz veya 500 karakteri geçemez.")
      return
    }
    try {
      await updateReply({ content })
      setIsEditing(false)
      setEditError(null)
      onMutated()
      toast.success("Yanıt güncellendi")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Güncellenemedi"
      setEditError(message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteReply()
      onMutated()
      toast.success("Yanıt silindi")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Silinemedi"
      toast.error(message)
    }
  }

  return (
    <div className="flex gap-2 text-xs justify-end">
      <div className="max-w-[80%] items-end">
        <div className="rounded-xl px-3 py-1.5 bg-ui-bg-interactive text-ui-fg-on-color rounded-tr-none">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-medium text-[10px] opacity-80">
              🏪 {reply.seller_name ?? "Mağaza"}
            </p>
            {!isEditing && (
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setEditText(reply.content) }}
                  className="text-[10px] opacity-70 hover:opacity-100 transition-opacity"
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-[10px] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-30"
                  title="Sil"
                >
                  {isDeleting ? "⏳" : "🗑️"}
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-1">
              <textarea
                className="w-full bg-white/20 text-ui-fg-on-color placeholder:text-white/50 border border-white/30 rounded-lg px-2 py-1 text-xs resize-none focus:outline-none min-h-[48px] max-h-[100px]"
                value={editText}
                maxLength={500}
                onChange={(e) => { setEditText(e.target.value); setEditError(null) }}
                autoFocus
              />
              {editError && <p className="text-[10px] text-red-300 mt-0.5">{editError}</p>}
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editText.trim()}
                  className="text-[10px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded disabled:opacity-40 transition-colors"
                >
                  {isUpdating ? "..." : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditError(null) }}
                  className="text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <p className="leading-snug whitespace-pre-line">{reply.content}</p>
          )}
        </div>
        <p className="text-[9px] text-ui-fg-muted mt-0.5 px-1 text-right">
          {formatDate(reply.created_at)}
        </p>
      </div>
      <div className="size-6 rounded-full bg-ui-bg-interactive flex items-center justify-center text-[10px] font-bold text-ui-fg-on-color shrink-0">
        🏪
      </div>
    </div>
  )
}