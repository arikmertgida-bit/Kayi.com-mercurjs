"use client"
import { HttpTypes } from "@medusajs/types"
import { Button, Input } from "@/components/atoms"
import { Heading, Label } from "@medusajs/ui"
import { useState } from "react"
import { applyPromotions } from "@/lib/data/cart"
import { toast } from "@/lib/helpers/toast"
import { useTranslations } from "next-intl"

export default function CartPromotionCode({
  cart,
}: {
  cart:
    | (HttpTypes.StoreCart & { promotions?: HttpTypes.StorePromotion[] })
    | null
}) {
  const [promotionCode, setPromotionCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('promotionCode')

  const handleApplyPromotionCode = async () => {
    setIsLoading(true)
    try {
      const res = await applyPromotions([promotionCode])
      if (res) {
        toast.success({ title: t('applied') })
      } else {
        toast.error({ title: t('notFound') })
      }
      setPromotionCode("")
    } catch (err) {
      console.error("[CartPromotionCode] Failed to apply promotion:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Heading
        level="h2"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline items-center"
      >
        {t('heading')}
      </Heading>
      <div>
        {cart?.promotions?.map((promo) => (
          <div
            key={promo.id}
            className="mb-4 flex flex-row gap-x-2 items-center"
          >
            <Label className="text-md">{promo.code}</Label>
          </div>
        ))}
      </div>
      <Input
        placeholder={t('placeholder')}
        value={promotionCode}
        onChange={(e) => setPromotionCode(e.target.value)}
      />
      <div className="flex justify-end">
        <Button
          className="mt-4 px-6"
          onClick={handleApplyPromotionCode}
          disabled={isLoading || !promotionCode}
          loading={isLoading}
          variant="tonal"
        >
          {t('apply')}
        </Button>
      </div>
    </div>
  )
}
