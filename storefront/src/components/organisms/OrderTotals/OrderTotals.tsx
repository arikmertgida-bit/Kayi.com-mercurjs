import { Card, Divider } from "@/components/atoms"
import { convertToLocale } from "@/lib/helpers/money"
import { OrderSetData } from "@/types/order-set"

export const OrderTotals = ({ orderSet }: { orderSet: OrderSetData }) => {
  const delivery = orderSet.shipping_total
  const subtotal = orderSet.total - delivery
  const total = orderSet.total

  const currency_code = orderSet.currency_code || "try"

  return (
    <Card className="mb-8 p-4">
      <p className="text-secondary label-md mb-2 flex justify-between">
        Ara Toplam:
        <span className="text-primary">
          {convertToLocale({
            amount: subtotal,
            currency_code,
          })}
        </span>
      </p>
      <p className="text-secondary label-md flex justify-between">
        Kargo:
        <span className="text-primary">
          {convertToLocale({
            amount: delivery,
            currency_code,
          })}
        </span>
      </p>
      <Divider className="my-4" />
      <p className="text-secondary label-md flex justify-between items-center">
        Toplam:{" "}
        <span className="text-primary heading-md">
          {convertToLocale({
            amount: total,
            currency_code,
          })}
        </span>
      </p>
    </Card>
  )
}
