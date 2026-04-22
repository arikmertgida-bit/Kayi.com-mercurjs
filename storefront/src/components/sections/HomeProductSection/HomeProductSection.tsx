import { HomeProductsCarousel } from "@/components/organisms"
import { Product } from "@/types/product"

export const HomeProductSection = async ({
  heading,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION || "pl",
  products = [],
  home = false,
  seller_handle,
}: {
  heading: string
  locale?: string
  products?: Product[]
  home?: boolean
  seller_handle?: string
}) => {
  return (
    <section className="py-8 w-full">
      <HomeProductsCarousel
        heading={heading}
        locale={locale}
        sellerProducts={products.slice(0, 10)}
        home={home}
        seller_handle={seller_handle}
      />
    </section>
  )
}
