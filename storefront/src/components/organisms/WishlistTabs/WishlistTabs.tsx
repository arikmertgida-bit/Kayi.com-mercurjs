"use client"

import { TabsContent, TabsList } from "@/components/molecules"
import { Suspense } from "react"
import { useWishlistContext } from "@/providers/WishlistProvider"
import { WishlistItem } from "@/components/cells"
import { HttpTypes } from "@medusajs/types"

export const wishlistTabs = [
  { label: "All", link: "/wishlist" },
  { label: "Products", link: "/wishlist/products" },
  { label: "Collections", link: "/wishlist/collections" },
]

export const WishlistTabs = ({ tab }: { tab: string }) => {
  const { wishlist } = useWishlistContext()
  const products = wishlist?.[0]?.products ?? []

  const ProductGrid = () =>
    products.length === 0 ? (
      <p className="text-secondary text-center py-8">
        İstek listeniz boş.
      </p>
    ) : (
      <div className="flex flex-wrap max-md:justify-center gap-4 mt-8">
        {products.map((product) => (
          <WishlistItem
            key={product.id}
            product={
              product as HttpTypes.StoreProduct & {
                calculated_amount: number
                currency_code: string
              }
            }
          />
        ))}
      </div>
    )

  return (
    <div>
      <TabsList list={wishlistTabs} activeTab={tab} />
      <TabsContent value="all" activeTab={tab}>
        <Suspense fallback={<p>Yükleniyor...</p>}>
          <ProductGrid />
        </Suspense>
      </TabsContent>
      <TabsContent value="products" activeTab={tab}>
        <Suspense fallback={<p>Yükleniyor...</p>}>
          <ProductGrid />
        </Suspense>
      </TabsContent>
      <TabsContent value="collections" activeTab={tab}>
        <div className="mt-8 text-center text-secondary py-8">
          Koleksiyon istek listesi yakında.
        </div>
      </TabsContent>
    </div>
  )
}
