"use client"

import { getUserWishlists, addWishlistItem, removeWishlistItem } from "@/lib/data/wishlist"
import { Wishlist } from "@/types/wishlist"
import { HttpTypes } from "@medusajs/types"
import { createContext, useContext, useEffect, useState } from "react"

type WishlistContextType = {
  wishlist: Wishlist[]
  user: HttpTypes.StoreCustomer | null | undefined
  isLoading: boolean
  isProductWishlisted: (productId: string) => boolean
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export const WishlistProvider = ({
  children,
  user,
}: {
  children: React.ReactNode
  user?: HttpTypes.StoreCustomer | null
}) => {
  const [wishlist, setWishlist] = useState<Wishlist[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    getUserWishlists()
      .then((res) => setWishlist(res.wishlists ?? []))
      .catch(() => setWishlist([]))
      .finally(() => setIsLoading(false))
  }, [user])

  const isProductWishlisted = (productId: string): boolean => {
    return wishlist?.[0]?.products?.some((p) => p.id === productId) ?? false
  }

  const addToWishlist = async (productId: string): Promise<void> => {
    // Optimistic update
    setWishlist((prev) => {
      if (!prev.length) {
        return [{ id: "", products: [{ id: productId } as HttpTypes.StoreProduct] }]
      }
      const current = prev[0]
      return [
        {
          ...current,
          products: [...(current.products ?? []), { id: productId } as HttpTypes.StoreProduct],
        },
        ...prev.slice(1),
      ]
    })

    try {
      await addWishlistItem({ reference_id: productId, reference: "product" })
      // Refresh to get full product data
      const res = await getUserWishlists()
      setWishlist(res.wishlists ?? [])
    } catch (error) {
      // Rollback on error
      setWishlist((prev) => {
        if (!prev.length) return prev
        return [
          {
            ...prev[0],
            products: prev[0].products?.filter((p) => p.id !== productId) ?? [],
          },
          ...prev.slice(1),
        ]
      })
      console.error("addToWishlist error:", error)
    }
  }

  const removeFromWishlist = async (productId: string): Promise<void> => {
    const wishlistId = wishlist?.[0]?.id
    if (!wishlistId) return

    // Optimistic update
    setWishlist((prev) => {
      if (!prev.length) return prev
      return [
        {
          ...prev[0],
          products: prev[0].products?.filter((p) => p.id !== productId) ?? [],
        },
        ...prev.slice(1),
      ]
    })

    try {
      await removeWishlistItem({ wishlist_id: wishlistId, product_id: productId })
    } catch (error) {
      // Rollback on error — re-fetch
      const res = await getUserWishlists().catch(() => ({ wishlists: wishlist }))
      setWishlist(res.wishlists ?? [])
      console.error("removeFromWishlist error:", error)
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        user,
        isLoading,
        isProductWishlisted,
        addToWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlistContext = (): WishlistContextType => {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error("useWishlistContext must be used within a WishlistProvider")
  }
  return ctx
}
