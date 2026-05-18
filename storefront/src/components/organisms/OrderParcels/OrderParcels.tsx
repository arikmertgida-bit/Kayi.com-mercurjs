import { Chat } from "../Chat/Chat"
import { retrieveCustomer } from "@/lib/data/customer"
import { OrderParcelItems } from "@/components/molecules/OrderParcelItems/OrderParcelItems"
import { OrderParcelStatus } from "@/components/molecules/OrderParcelStatus/OrderParcelStatus"
import { OrderParcelActions } from "@/components/molecules/OrderParcelActions/OrderParcelActions"
import { getVendorImage, resolveOwnerMember } from "@/lib/utils/get-vendor-image"
import { SellerAvatar } from "@/components/cells/SellerAvatar/SellerAvatar"
import { HttpTypes } from "@medusajs/types"
import type { SellerProps } from "@/types/seller"

type OrderWithSeller = HttpTypes.StoreOrder & {
  seller: SellerProps
  currency_code: string
}

export const OrderParcels = async ({ orders }: { orders: OrderWithSeller[] }) => {
  const user = await retrieveCustomer()

  return (
    <>
      {orders.map((order) => (
        <div key={order.id} className="w-full mb-8">
          <div className="border rounded-sm p-4 bg-component-secondary font-semibold text-secondary uppercase">
            Sipariş No #{order.display_id}
          </div>
          <div className="border rounded-sm">
            <div className="p-4 border-b">
              <OrderParcelStatus order={order} />
            </div>
            <div className="p-4 border-b md:flex items-center justify-between">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <SellerAvatar
                    photo={getVendorImage({ memberPhoto: resolveOwnerMember(order.seller.members)?.photo })}
                    size={40}
                    alt={order.seller.name}
                  />
                </div>
                <p className="text-primary">{order.seller.name}</p>
              </div>
              <Chat
                user={user}
                seller={order.seller}
                order_id={order.id}
                buttonClassNames="label-md text-action-on-secondary uppercase flex items-center gap-2"
              />
            </div>
            <div className="p-4 border-b">
              <OrderParcelItems
                items={order.items ?? []}
                currency_code={order.currency_code || "try"}
              />
            </div>
            <div className="p-4">
              <OrderParcelActions order={order} />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
