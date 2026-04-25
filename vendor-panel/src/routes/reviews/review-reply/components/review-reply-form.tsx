import { useForm } from "react-hook-form"
import { useRef, useState } from "react"
import { Form } from "../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Textarea, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useReview, useUpdateReview, useReviewReplies, useCreateReviewReply } from "../../../../hooks/api/review"

const ReviewReplySchema = z.object({
  seller_note: z.string().min(1),
})

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

  const form = useForm<z.infer<typeof ReviewReplySchema>>({
    defaultValues: {
      seller_note: review.seller_note || "",
    },
    resolver: zodResolver(ReviewReplySchema),
  })

  const { mutateAsync, isPending } = useUpdateReview(id!)
  //@ts-ignore
  const handleSubmit = form.handleSubmit(async (data, { deleting }) => {
    if (deleting) {
      await mutateAsync(
        {
          seller_note: "",
        },
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
    } else {
      await mutateAsync(
        {
          seller_note: data.seller_note,
        },
        {
          onSuccess: () => {
            toast.success("Reply has been sent")
            handleSuccess(`/reviews/${id}`)
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
  })

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
      toast.success("Yanıt gönderildi")
    } catch (err: any) {
      toast.error(err?.message ?? "Yanıt gönderilemedi")
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
      <RouteDrawer.Form form={form}>
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

          <Form.Field
            control={form.control}
            name="seller_note"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>Comment</Form.Label>
                  <Form.Control>
                    <Textarea autoComplete="off" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />

          {/* ─── Customer Replies Thread ─── */}
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
                {replies.map((reply: any) => (
                  <div
                    key={reply.id}
                    className={`flex gap-2 text-xs ${reply.is_seller_reply ? "justify-end" : ""}`}
                  >
                    {!reply.is_seller_reply && (
                      <div className="size-6 rounded-full bg-ui-bg-base-pressed flex items-center justify-center text-[10px] font-bold text-ui-fg-subtle shrink-0">
                        {reply.customer
                          ? `${reply.customer.first_name?.[0] ?? ""}${reply.customer.last_name?.[0] ?? ""}`.toUpperCase() || "K"
                          : "K"}
                      </div>
                    )}
                    <div className={`max-w-[80%] ${reply.is_seller_reply ? "items-end" : ""}`}>
                      <div
                        className={`rounded-xl px-3 py-1.5 ${
                          reply.is_seller_reply
                            ? "bg-ui-bg-interactive text-ui-fg-on-color rounded-tr-none"
                            : "bg-ui-bg-base border border-ui-border-base rounded-tl-none"
                        }`}
                      >
                        <p className="font-medium mb-0.5 text-[10px] opacity-80">
                          {reply.is_seller_reply
                            ? `🏪 ${reply.seller_name ?? "Mağaza"}`
                            : reply.customer
                            ? `${reply.customer.first_name} ${reply.customer.last_name}`.trim() || "Müşteri"
                            : "Müşteri"}
                        </p>
                        <p className="leading-snug whitespace-pre-line">{reply.content}</p>
                      </div>
                      <p className="text-[9px] text-ui-fg-muted mt-0.5 px-1">
                        {formatDate(reply.created_at)}
                      </p>
                    </div>
                    {reply.is_seller_reply && (
                      <div className="size-6 rounded-full bg-ui-bg-interactive flex items-center justify-center text-[10px] font-bold text-ui-fg-on-color shrink-0">
                        🏪
                      </div>
                    )}
                  </div>
                ))}
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
      </RouteDrawer.Form>
      <RouteDrawer.Footer>
        {review.seller_note && (
          <Button
            className="px-6"
            variant="secondary"
            //@ts-ignore
            onClick={() => handleSubmit({ deleting: true })}
          >
            Delete reply
          </Button>
        )}
        <Button
          //@ts-ignore
          onClick={() => handleSubmit({ deleting: false })}
          className="px-6"
          isLoading={isPending}
        >
          {review.seller_note ? "Save" : "Reply"}
        </Button>
      </RouteDrawer.Footer>
    </RouteDrawer>
  )
}