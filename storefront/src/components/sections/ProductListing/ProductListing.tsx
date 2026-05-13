import {
  ProductListingActiveFilters,
  ProductListingHeader,
  ProductSidebar,
  ProductsList,
  ProductsPagination,
} from "@/components/organisms"
import { PRODUCT_LIMIT } from "@/const"
import { listProductsWithSort } from "@/lib/data/products"
import { getProductPromotions } from "@/lib/data/promotions"
import type { ProductPromotion } from "@/lib/data/promotions"

export const ProductListing = async ({
  category_id,
  collection_id,
  seller_id,
  showSidebar = false,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION || "",
  page = 1,
}: {
  category_id?: string | string[]
  collection_id?: string
  seller_id?: string
  showSidebar?: boolean
  locale?: string
  page?: number
}) => {
  const { response } = await listProductsWithSort({
    page,
    seller_id,
    category_id,
    collection_id,
    countryCode: locale,
    sortBy: "created_at",
    queryParams: {
      limit: PRODUCT_LIMIT,
    },
  })

  const { products, count: totalCount } = await response

  const pages = Math.ceil(totalCount / PRODUCT_LIMIT) || 1

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
      <ProductListingHeader total={totalCount} />
      <div className="hidden md:block">
        <ProductListingActiveFilters />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-4">
        {showSidebar && <ProductSidebar />}
        <section className={showSidebar ? "col-span-3" : "col-span-4"}>
          <div className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
            <ProductsList products={products} promotionsMap={promotionsMap} />
          </div>
          <ProductsPagination pages={pages} />
        </section>
      </div>
    </div>
  )
}
