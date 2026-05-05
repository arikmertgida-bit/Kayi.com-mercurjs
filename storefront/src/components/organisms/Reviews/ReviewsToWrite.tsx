"use client"
import { Card, NavigationItem } from "@/components/atoms"
import { Modal, ReviewForm } from "@/components/molecules"
import { isEmpty } from "lodash"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Order } from "@/lib/data/reviews"
import { OrderCard } from "./OrderCard"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

const REVIEW_NAVIGATION = [
  { key: "toWrite", href: "/user/reviews" },
  { key: "written", href: "/user/reviews/written" },
]

export const ReviewsToWrite = ({ orders }: { orders: Array<Order> }) => {
  const [showForm, setShowForm] = useState<
    | (HttpTypes.StoreOrder & {
        seller: { id: string; name: string; reviews?: any[] }
        reviews: any[]
      })
    | null
  >(null)
  const pathname = usePathname()
  const t = useTranslations('reviewsSection')

  return (
    <>
      <div className="md:col-span-3 space-y-8">
        <h1 className="heading-md uppercase">{t('title')}</h1>
        <div className="flex gap-4">
          {REVIEW_NAVIGATION.map((item) => (
            <NavigationItem
              key={item.key}
              href={item.href}
              active={pathname === item.href}
              className="px-0"
            >
              {t(item.key as any)}
            </NavigationItem>
          ))}
        </div>
        {isEmpty(orders) ? (
          <Card>
            <div className="text-center py-6">
              <h3 className="heading-lg text-primary uppercase">
                {t('noToWrite')}
              </h3>
              <p className="text-lg text-secondary mt-2">
                {t('noToWriteDesc')}
              </p>
            </div>
          </Card>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} showForm={setShowForm} />
          ))
        )}
      </div>
      {showForm && (
        <Modal heading={t('writeReviewModal')} onClose={() => setShowForm(null)}>
          <ReviewForm seller={showForm} handleClose={() => setShowForm(null)} />
        </Modal>
      )}
    </>
  )
}
