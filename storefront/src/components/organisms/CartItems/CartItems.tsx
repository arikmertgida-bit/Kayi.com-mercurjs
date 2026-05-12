import {
  CartItemsFooter,
  CartItemsHeader,
  CartItemsProducts,
} from "@/components/cells"
 import { HttpTypes } from "@medusajs/types"
import { groupItemsBySeller } from "@/lib/helpers/group-items-by-seller"
import { EmptyCart } from "./EmptyCart"

export const CartItems = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  if (!cart) return null

  const groupedItems = groupItemsBySeller(cart)

  if (!Object.keys(groupedItems).length) return <EmptyCart />

  return Object.keys(groupedItems).map((key) => (
    <div key={key} className="mb-4">
      <CartItemsHeader seller={groupedItems[key]?.seller} />
      <CartItemsProducts
        products={groupedItems[key].items || []}
        currency_code={cart.currency_code}
      />
      <CartItemsFooter
        currency_code={cart.currency_code}
        price={cart.shipping_subtotal}
      />
    </div>
  ))
}
