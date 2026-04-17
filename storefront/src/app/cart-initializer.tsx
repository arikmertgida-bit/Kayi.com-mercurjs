import { retrieveCart } from "@/lib/data/cart"
import { Providers } from "./providers"

/**
 * Async server component that fetches cart data and initialises the CartProvider.
 * Placed inside a <Suspense> boundary in layout.tsx so that the initial HTML
 * streams immediately (with cart=null) while this component resolves in parallel.
 */
export async function CartInitializer({
  children,
}: {
  children: React.ReactNode
}) {
  const cart = await retrieveCart()
  return <Providers cart={cart}>{children}</Providers>
}
