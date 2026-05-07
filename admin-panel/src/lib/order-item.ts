import { AdminOrderLineItem, OrderLineItemDTO } from "@medusajs/types"

export const getFulfillableQuantity = (item: OrderLineItemDTO | AdminOrderLineItem) => {
  return item.quantity - item.detail.fulfilled_quantity
}
