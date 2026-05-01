"use client"
import {
  FieldError,
  FieldValues,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { reviewSchema, ReviewFormData } from "./schema"
import { Button } from "@/components/atoms"
import { InteractiveStarRating } from "@/components/atoms/InteractiveStarRating/InteractiveStarRating"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createReview, uploadReviewImages, Order } from "@/lib/data/reviews"

type ImageSlotStatus = "empty" | "uploading" | "uploaded" | "error"

interface ImageSlot {
  status: ImageSlotStatus
  url?: string
  preview?: string
}

interface Props {
  handleClose?: () => void
  seller: Order | null
  referenceType?: "seller" | "product"
  referenceId?: string
}

const DEV_BYPASS_ORDER_ID = "__dev_bypass_order__"

export const ReviewForm: React.FC<Props> = ({ ...props }) => {
  const methods = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      sellerId: "",
      rating: 0,
      opinion: "",
      images: [],
    },
  })

  return (
    <FormProvider {...methods}>
      <Form {...props} />
    </FormProvider>
  )
}

const MAX_IMAGES = 4

const Form: React.FC<Props> = ({ handleClose, seller, referenceType = "seller", referenceId }) => {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
    { status: "empty" },
    { status: "empty" },
    { status: "empty" },
    { status: "empty" },
  ])
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const {
    watch,
    handleSubmit,
    register,
    setValue,
    formState: { errors },
  } = useFormContext()

  const uploadImage = async (file: File, slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = {
        status: "uploading",
        preview: URL.createObjectURL(file),
      }
      return next
    })

    try {
      const formData = new FormData()
      formData.append("files", file)

      const res = await fetch("/api/upload-review-image", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error("Upload failed")
      }

      setImageSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = {
          status: "uploaded",
          url: data.url,
          preview: data.url,
        }
        return next
      })

      const currentImages = (watch("images") as string[]) || []
      const updatedImages = [...currentImages]
      updatedImages[slotIndex] = data.url
      setValue("images", updatedImages.filter(Boolean))
    } catch {
      setImageSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = {
          status: "error",
          preview: prev[slotIndex].preview,
        }
        return next
      })
    }
  }

  const removeImage = (slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = { status: "empty" }
      return next
    })
    const currentImages = (watch("images") as string[]) || []
    const updatedImages = [...currentImages]
    updatedImages[slotIndex] = ""
    setValue("images", updatedImages.filter(Boolean))
    if (fileInputRefs[slotIndex].current) {
      fileInputRefs[slotIndex].current!.value = ""
    }
  }

  const submit = async (data: FieldValues) => {
    const body = {
      order_id: seller?.id || DEV_BYPASS_ORDER_ID,
      rating: data.rating,
      reference: referenceType,
      reference_id: referenceId || seller?.seller.id,
      customer_note: data.opinion,
    }

    const response = await createReview(body)

    if (response.error || response.message) {
      setError(response.message || "Bir sorun oluştu. Lütfen tekrar deneyin.")
      return
    }

    // Upload images if any
    const uploadedUrls = imageSlots
      .filter((s) => s.status === "uploaded" && s.url)
      .map((s) => s.url as string)

    if (uploadedUrls.length > 0 && response.review?.id) {
      await uploadReviewImages(response.review.id, uploadedUrls)
    }

    setError("")
    router.refresh()
    handleClose && handleClose()
  }

  const lettersCount = watch("opinion")?.length || 0
  const rating = watch("rating")
  const isUploading = imageSlots.some((s) => s.status === "uploading")

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="space-y-5 px-4 py-2">
        <div className="max-w-full grid grid-cols-1 items-top gap-4 mb-4">
          <div>
            <label className="label-sm mb-2 block text-[#8a1d54]">Puanınız</label>
            <InteractiveStarRating
              value={rating}
              onChange={(value) => setValue("rating", value)}
              error={!!errors.rating}
            />
            {errors.rating?.message && (
              <p className="label-sm text-negative mt-1">
                {(errors.rating as FieldError).message}
              </p>
            )}
          </div>

          <label className={cn("label-sm block relative")}>
            <p className={cn("mb-2 text-[#8a1d54]", error && "text-negative")}>Yorumunuz</p>
            <textarea
              className={cn(
                "relative h-32 w-full rounded-2xl border border-[#f3c7d9] bg-[linear-gradient(180deg,_rgba(255,247,251,0.98),_rgba(255,241,232,0.88))] px-4 py-3 text-sm text-primary shadow-inner focus:border-[#dd2a7b] focus:outline-none focus:ring-0",
                error && "border-negative focus:border-negative"
              )}
              placeholder="Ürünü birkaç cümleyle anlatın..."
              {...register("opinion")}
            />
            <div
              className={cn(
                "absolute right-4 label-medium text-secondary/80",
                errors.opinion?.message ? "bottom-8" : "bottom-3"
              )}
            >
              {`${lettersCount} / 500`}
            </div>
            {errors.opinion?.message && (
              <p className="label-sm text-negative">
                {(errors.opinion as FieldError).message}
              </p>
            )}
          </label>

          {/* Photo upload section */}
          <div>
            <p className="label-sm mb-2 text-[#8a1d54]">Fotoğraflar (max {MAX_IMAGES})</p>
            <div className="flex flex-wrap gap-3">
              {imageSlots.map((slot, index) => (
                <div key={index} className="relative">
                  <input
                    ref={fileInputRefs[index]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadImage(file, index)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (slot.status === "empty" || slot.status === "error") {
                        fileInputRefs[index].current?.click()
                      }
                    }}
                    className={cn(
                      "relative flex size-24 items-center justify-center overflow-hidden rounded-2xl border",
                      slot.status === "empty" &&
                        "cursor-pointer border-dashed border-[#efbdd1] bg-[linear-gradient(180deg,_#fff7fb,_#fff2e8)] hover:border-[#dd2a7b] transition-colors",
                      slot.status === "uploading" && "border-[#efbdd1] bg-[linear-gradient(180deg,_#fff7fb,_#fff2e8)]",
                      slot.status === "uploaded" && "border-[#dd2a7b]",
                      slot.status === "error" && "cursor-pointer border-negative"
                    )}
                  >
                    {slot.status === "empty" && (
                      <span className="text-2xl text-[#c13584]">+</span>
                    )}

                    {slot.status === "uploading" && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="size-5 border-2 border-action border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-secondary">Yükleniyor...</span>
                      </div>
                    )}

                    {(slot.status === "uploaded" || slot.status === "error") && slot.preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.preview}
                        alt={`Review photo ${index + 1}`}
                        className="size-full object-cover"
                      />
                    )}

                    {slot.status === "error" && (
                      <div className="absolute inset-0 bg-negative/60 flex flex-col items-center justify-center">
                        <span className="text-xs text-white text-center px-1">
                          Hata. Yeniden deneyin.
                        </span>
                      </div>
                    )}

                    {slot.status === "uploaded" && (
                      <div className="absolute top-1 right-1 size-5 bg-positive rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  {(slot.status === "uploaded" || slot.status === "error") && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -left-1.5 size-5 bg-negative rounded-full flex items-center justify-center text-white text-xs hover:opacity-80"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="label-md text-negative">{error}</p>}
        <Button
          type="submit"
          className="w-full rounded-full border-0 bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] py-3 text-white shadow-[0_14px_28px_rgba(221,42,123,0.24)] hover:opacity-95"
          disabled={isUploading}
        >
          {isUploading ? "FOTOĞRAFLAR YÜKLENİYOR..." : "YORUMU GÖNDER"}
        </Button>
      </div>
    </form>
  )
}
