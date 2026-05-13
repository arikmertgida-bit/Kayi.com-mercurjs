import { ProductsList, ProductsPagination } from "@/components/organisms"
import { PRODUCT_LIMIT } from "@/const"
import { getSellerProducts } from "@/lib/data/seller"
import { getProductPromotions } from "@/lib/data/promotions"
import type { ProductPromotion } from "@/lib/data/promotions"
import { getTranslations } from "next-intl/server"

export const SellerProductListing = async ({
  seller_handle,
  locale,
  page = 1,
}: {
  seller_handle: string
  locale: string
  page?: number
}) => {
  const t = await getTranslations('seller')
  const { products, count } = await getSellerProducts(seller_handle, locale, page)
  const pages = Math.ceil(count / PRODUCT_LIMIT) || 1

  if (!products.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-ui-fg-subtle">{t('noProducts')}</p>
      </div>
    )
  }

  const promotionResults = await Promise.all(
    products.map((p) =>
      getProductPromotions(p.id).catch(() => ({ promotions: [] }))
    )
  )
  const promotionsMap: Record<string, ProductPromotion | null> = {}
  products.forEach((p, i) => {
    const list = promotionResults[i]?.promotions ?? []
    promotionsMap[p.id] = list.length > 0 ? list[0] : null
  })

  return (
    <div className="py-4">
      <div className="my-4 label-md">{t('productCount', { count })}</div>
      <div className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
        <ProductsList products={products} promotionsMap={promotionsMap} />
      </div>
      <ProductsPagination pages={pages} />
    </div>
  )
}
