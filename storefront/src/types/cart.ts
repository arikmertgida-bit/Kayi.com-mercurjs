import { HttpTypes } from "@medusajs/types"

export type Cart = Omit<HttpTypes.StoreCart, "promotions"> & {
  promotions?: HttpTypes.StorePromotion[]
}

export interface StoreCartLineItemOptimisticUpdate
  extends Partial<HttpTypes.StoreCartLineItem> {
  tax_total: number
}
