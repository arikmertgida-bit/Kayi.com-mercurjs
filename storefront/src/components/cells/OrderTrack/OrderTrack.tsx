import { HttpTypes } from "@medusajs/types"
import { Card } from "@/components/atoms"
import { useTranslations } from "next-intl"

type FulfillmentWithLabels = HttpTypes.StoreOrderFulfillment & {
  labels?: { id: string; tracking_number: string }[]
}

type OrderWithFulfillments = HttpTypes.StoreOrder & {
  fulfillments?: FulfillmentWithLabels[]
}

export const OrderTrack = ({ order }: { order: OrderWithFulfillments }) => {
  if (!order.fulfillments?.[0]?.labels?.length) return null

  const labels = order.fulfillments[0].labels ?? []
  const t = useTranslations('orders')

  return (
    <div>
      <h2 className="text-primary label-lg uppercase">{t('trackingTitle')}</h2>
      <ul className="mt-4">
        {labels.map((item) => (
          <li key={item.id}>
            <a href={item.tracking_number} target="_blank">
              <Card className="px-4 hover:bg-secondary/30">
                {item.tracking_number}
              </Card>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
