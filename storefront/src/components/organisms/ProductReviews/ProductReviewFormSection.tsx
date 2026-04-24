"use client"
import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Modal, ReviewForm } from "@/components/molecules"
import { Button } from "@/components/atoms"

interface Props {
  product: HttpTypes.StoreProduct & { seller?: any }
  customer: HttpTypes.StoreCustomer | null
  canReview: boolean
  matchedOrder: any | null
  locale: string
}

export const ProductReviewFormSection = ({ product, customer, canReview, matchedOrder }: Props) => {
  const [showForm, setShowForm] = useState(false)

  if (!customer) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/70 bg-white/80 p-6 text-center shadow-[0_16px_40px_rgba(221,42,123,0.08)]">
        <p className="label-md text-secondary">Sign in to leave a review for this product.</p>
      </div>
    )
  }

  if (!canReview) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/70 bg-white/80 p-6 text-center shadow-[0_16px_40px_rgba(221,42,123,0.08)]">
        <p className="label-md text-secondary">
          Only verified buyers can review this product.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-[24px] border border-white/70 bg-white/85 p-6 text-center shadow-[0_18px_44px_rgba(245,133,41,0.10)] backdrop-blur">
        <p className="mb-4 label-md text-[#8a1d54]">Share your experience with this product</p>
        <Button
          onClick={() => setShowForm(true)}
          className="inline-flex rounded-full border-0 bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-6 py-3 text-white shadow-[0_14px_28px_rgba(221,42,123,0.24)] hover:opacity-95"
        >
          Write a Review
        </Button>
      </div>

      {showForm && (
        <Modal heading="Write a Review" onClose={() => setShowForm(false)}>
          <ReviewForm
            seller={matchedOrder}
            handleClose={() => setShowForm(false)}
            referenceType="product"
            referenceId={product.id}
          />
        </Modal>
      )}
    </>
  )
}
