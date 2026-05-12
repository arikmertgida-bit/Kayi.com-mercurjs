import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"

type ExtendedLineItem = HttpTypes.StoreCartLineItem & {
  product?: HttpTypes.StoreProduct & {
    seller?: SellerProps
  }
}

export type GroupedBySeller = Record<
  string,
  { seller: SellerProps; items: HttpTypes.StoreCartLineItem[] }
>

const FLEEK_SELLER: SellerProps = {
  id: "fleek",
  name: "Fleek",
  handle: "",
  description: "",
  tax_id: "",
  created_at: new Date(0).toISOString(),
  photo: "/Logo.svg",
}

export function groupItemsBySeller(cart: HttpTypes.StoreCart): GroupedBySeller {
  const grouped: GroupedBySeller = {}

  cart.items?.forEach((item) => {
    const extended = item as ExtendedLineItem
    const seller = extended.product?.seller

    if (seller) {
      if (!grouped[seller.id]) {
        grouped[seller.id] = { seller, items: [] }
      }
      grouped[seller.id].items.push(item)
    } else {
      if (!grouped["fleek"]) {
        grouped["fleek"] = { seller: FLEEK_SELLER, items: [] }
      }
      grouped["fleek"].items.push(item)
    }
  })

  return grouped
}
