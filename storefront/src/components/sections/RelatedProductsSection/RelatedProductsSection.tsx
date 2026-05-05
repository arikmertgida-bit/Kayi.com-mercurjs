import { HomeSlider } from "@/components/organisms/HomeProductsCarousel/HomeSlider"
import { listProducts } from "@/lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"
import { getTranslations } from "next-intl/server"

interface Props {
  product: HttpTypes.StoreProduct & { seller?: SellerProps }
  locale: string
}

export const RelatedProductsSection = async ({ product, locale }: Props) => {
  const t = await getTranslations('listing')
  const categoryId = product.categories?.[0]?.id
  const categoryHandle = product.categories?.[0]?.handle

  if (!categoryId) return null

  const {
    response: { products },
  } = await listProducts({
    countryCode: locale,
    category_id: categoryId,
    queryParams: { limit: 11, order: "-created_at" },
    forceCache: true,
  })

  const related = products
    .filter((p) => p.id !== product.id)
    .slice(0, 10) as HttpTypes.StoreProduct[]

  if (!related.length) return null

  return (
    <section className="py-4 w-full">
      <HomeSlider
        heading={t('relatedProducts')}
        initialProducts={related}
        allProductsHref={categoryHandle ? `/categories/${categoryHandle}` : "/categories"}
      />
    </section>
  )
}
