import { ProductCard } from "../ProductCard/ProductCard"
import { HttpTypes } from "@medusajs/types"
import type { ProductPromotion } from "@/lib/data/promotions"

export const ProductsList = ({
  products,
  promotionsMap,
}: {
  products: HttpTypes.StoreProduct[]
  promotionsMap?: Record<string, ProductPromotion | null>
}) => {
  return (
    <>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          api_product={product}
          activePromotion={promotionsMap?.[product.id] ?? null}
        />
      ))}
    </>
  )
}
