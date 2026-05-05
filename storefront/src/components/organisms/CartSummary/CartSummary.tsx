"use client"

import { convertToLocale } from "@/lib/helpers/money"
import { useTranslations } from "next-intl"

export const CartSummary = ({
  item_total,
  shipping_total,
  total,
  currency_code,
  tax,
  discount_total,
}: {
  item_total: number
  shipping_total: number
  total: number
  currency_code: string
  tax: number
  discount_total: number
}) => {
  const t = useTranslations('cart')
  return (
    <div>
      <div className="space-y-4 label-md text-secondary mb-4">
        <div className="flex justify-between">
          <span>{t('items')}:</span>
          <span className="text-primary">
            {convertToLocale({
              amount: item_total,
              currency_code,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t('delivery')}:</span>
          <span className="text-primary">
            {convertToLocale({
              amount: shipping_total,
              currency_code,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t('tax')}:</span>
          <span className="text-primary">
            {convertToLocale({
              amount: tax,
              currency_code,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t('discount')}:</span>
          <span className="text-primary">
            {convertToLocale({
              amount: discount_total,
              currency_code,
            })}
          </span>
        </div>
        <div className="flex justify-between border-t pt-4 items-center">
          <span>{t('total')}:</span>
          <span className="label-xl text-primary">
            {convertToLocale({
              amount: total,
              currency_code,
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
