import { retrieveCart } from "@/lib/data/cart"
import { CartSynchronizer } from "./cart-synchronizer"

/**
 * Async server component that fetches cart data and injects it into
 * CartContext via CartSynchronizer — without wrapping or remounting children.
 * Placed inside a <Suspense> boundary whose fallback={null} so that the
 * children tree (already mounted outside Suspense) is never touched.
 */
export async function CartInitializer() {
  const cart = await retrieveCart()
  return <CartSynchronizer cart={cart} />
}
