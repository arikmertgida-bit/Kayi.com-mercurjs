"use client"

import { StarRating } from "@/components/atoms"
import { SingleProductReview } from "@/types/product"
import { Divider } from "@medusajs/ui"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import Image from "next/image"
import { useTranslations } from "next-intl"

export const SellerReview = ({
  review,
  productMap = {},
}: {
  review: SingleProductReview
  productMap?: Record<string, { title: string; thumbnail: string | null }>
}) => {
  const t = useTranslations('seller')
  const product =
    review.reference === "product" && review.reference_id
      ? productMap[review.reference_id]
      : undefined

  return (
    <div className="mb-4 border-b pb-4 flex gap-4">
      <div className="mb-4 w-1/6 items-center">
        <p className="label-md text-secondary mb-2 truncate">
          {review.customer.first_name} {review.customer.last_name}
        </p>
        <StarRating starSize={12} rate={Number(review.rating.toFixed(1))} />
        <p className="text-sm text-secondary mt-2">
          {formatDistanceToNow(new Date(review.created_at), {
            addSuffix: true,
            locale: tr,
          })}
        </p>
      </div>
      <div className="w-5/6">
        {product && (
          <div className="flex items-center gap-2 mb-2 rounded-md bg-gray-50 px-2 py-1 w-fit">
            {product.thumbnail && (
              <Image
                src={product.thumbnail}
                alt={product.title}
                width={24}
                height={24}
                className="rounded object-cover"
              />
            )}
            <span className="text-xs text-secondary font-medium">
              İlgili Ürün: {product.title}
            </span>
          </div>
        )}
        <p className="text-md whitespace-pre-line break-words">
          {review.customer_note}
        </p>
        {review.seller_note && (
          <div className="mt-4 flex gap-4 relative">
            <Divider orientation="vertical" className="h-auto" />
            <div>
              <p className="label-md text-primary">
                {t('replyFrom', { name: review.seller.name })}{" "}
                <span className="text-secondary">
                  |{" "}
                  {formatDistanceToNow(new Date(review.updated_at), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </span>
              </p>
              <p className="label-sm mt-2">{review.seller_note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
