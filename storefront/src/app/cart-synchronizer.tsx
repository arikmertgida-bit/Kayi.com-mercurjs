"use client"

import { useEffect } from "react"
import { useCartContext } from "@/components/providers"
import { Cart } from "@/types/cart"

/**
 * Client component that receives the resolved cart from the server and
 * synchronises it into CartContext without ever remounting the children tree.
 * Rendered inside a <Suspense> that does NOT wrap {children}, so children
 * are mounted exactly once and their event handlers are never detached.
 */
export function CartSynchronizer({ cart }: { cart: Cart | null }) {
  const { setCart } = useCartContext()

  useEffect(() => {
    setCart(cart)
  }, [cart, setCart])

  return null
}
