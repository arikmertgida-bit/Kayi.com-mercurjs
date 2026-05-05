import { HomeSlider } from "./HomeSlider"
import { listProducts } from "@/lib/data/products"
import { Product } from "@/types/product"
import { HttpTypes } from "@medusajs/types"

export const HomeProductsCarousel = async ({
  heading,
  locale,
  sellerProducts,
  home,
  seller_handle,
}: {
  heading: string
  locale: string
  sellerProducts: Product[]
  home: boolean
  seller_handle?: string
}) => {
  const {
    response: { products },
  } = await listProducts({
    countryCode: locale,
    queryParams: {
      limit: home ? 10 : undefined,
      order: "-created_at",
      handle: home
        ? undefined
        : sellerProducts.map((product) => product.handle),
    },
    forceCache: home,
  })

  if (!products.length && !sellerProducts.length) return null

  const displayProducts = (
    home ? products : products.length ? products : sellerProducts
  ) as HttpTypes.StoreProduct[]

  return (
    <HomeSlider heading={heading} initialProducts={displayProducts} seller_handle={seller_handle} />
  )
}
