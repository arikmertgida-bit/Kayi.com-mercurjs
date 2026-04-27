import { Suspense } from "react"
import { ProductListingSkeleton } from "../ProductListingSkeleton/ProductListingSkeleton"
import { MeiliProductsListing, ProductListing } from "@/components/sections"
import { SellerProps } from "@/types/seller"
import { SellerTabsSwitcher } from "./SellerTabsSwitcher"
import { SellerScore, SellerReviewList } from "@/components/molecules"
import { SellerSidebar } from "../SellerSidebar/SellerSidebar"

const MEILISEARCH_HOST = process.env.NEXT_PUBLIC_MEILISEARCH_HOST
const MEILISEARCH_SEARCH_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY

export const SellerTabs = ({
  seller_handle,
  seller_id,
  locale,
  currency_code,
  seller,
  categories,
  productCount,
  productMap = {},
  page = 1,
}: {
  tab: string
  seller_handle: string
  seller_id: string
  locale: string
  currency_code: string
  seller: SellerProps
  categories: { id: string; name: string; handle: string }[]
  productCount: number
  productMap?: Record<string, { title: string; thumbnail: string | null }>
  page?: number
}) => {
  const filteredReviews = seller.reviews?.filter((r) => r !== null) ?? []
  const reviewCount = filteredReviews.length
  const rating =
    reviewCount > 0
      ? filteredReviews.reduce((sum, r) => sum + (r?.rating || 0), 0) / reviewCount
      : 0

  const productContent = (
    <Suspense fallback={<ProductListingSkeleton />}>
      {!MEILISEARCH_HOST || !MEILISEARCH_SEARCH_KEY ? (
        <ProductListing seller_id={seller_id} page={page} />
      ) : (
        <MeiliProductsListing
          locale={locale}
          seller_handle={seller_handle}
          currency_code={currency_code}
          sidebarContent={
            <SellerSidebar
              seller={seller}
              categories={categories}
              productCount={productCount}
            />
          }
        />
      )}
    </Suspense>
  )

  const reviewContent = (
    <div className="grid grid-cols-1 lg:grid-cols-4 mt-8">
      <div className="border rounded-sm p-4">
        <SellerScore rate={rating} reviewCount={reviewCount} />
      </div>
      <div className="col-span-3 border rounded-sm p-4">
        <h3 className="heading-sm uppercase border-b pb-4">Seller reviews</h3>
        <SellerReviewList reviews={seller.reviews} productMap={productMap} />
      </div>
    </div>
  )

  return (
    <SellerTabsSwitcher
      productContent={productContent}
      reviewContent={reviewContent}
    />
  )
}
