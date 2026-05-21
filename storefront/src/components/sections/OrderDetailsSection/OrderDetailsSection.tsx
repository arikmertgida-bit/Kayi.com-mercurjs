import { OrderAddresses } from "@/components/organisms/OrderAddresses/OrderAddresses"
import { OrderParcels } from "@/components/organisms/OrderParcels/OrderParcels"
import { OrderTotals } from "@/components/organisms/OrderTotals/OrderTotals"
import { OrderSetData } from "@/types/order-set"

export const OrderDetailsSection = ({ orderSet }: { orderSet: OrderSetData }) => {
  return (
    <div>
      <OrderParcels orders={orderSet.orders} />
      <OrderTotals orderSet={orderSet} />
      {/* <OrderAddresses /> */}
    </div>
  )
}
