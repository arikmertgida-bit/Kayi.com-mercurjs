"use client"

import { StarRating } from "@/components/atoms"
import { useTranslations } from "next-intl"

export const SellerScore = ({
  rate,
  reviewCount,
}: {
  rate: number
  reviewCount: number
}) => {
  const t = useTranslations('seller')
  return (
    <div className="flex items-center flex-col label-md h-full py-12">
      <h3 className="heading-sm uppercase mb-2">{t('sellerScore')}</h3>
      <div className="flex gap-2 items-center mb-4 text-secondary">
        <StarRating rate={rate} starSize={16} /> {rate.toFixed(1)}
      </div>
      <p className="text-secondary">{t('reviewCountLabel', { count: reviewCount })}</p>
    </div>
  )
}
