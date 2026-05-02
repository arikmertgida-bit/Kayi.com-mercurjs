"use client"

import { Suspense } from "react"
import { ProductListingSkeleton } from "../ProductListingSkeleton/ProductListingSkeleton"
import { SellerProductListing } from "@/components/sections"
import { MeiliProductsListing } from "@/components/sections"
import { SellerProps } from "@/types/seller"
import { SellerTabsSwitcher } from "./SellerTabsSwitcher"
import { SellerScore, SellerReviewList } from "@/components/molecules"
import { SellerSidebar } from "../SellerSidebar/SellerSidebar"
import { useMeiliSearchClient } from "@/providers/MeiliSearchProvider"

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

  const { searchClient } = useMeiliSearchClient()
  const useMeili = Boolean(searchClient)

  const productContent = useMeili ? (
    <div className="mt-6">
      <Suspense fallback={<ProductListingSkeleton />}>
        <MeiliProductsListing
          seller_handle={seller_handle}
          locale={locale}
          currency_code={currency_code}
          sidebarContent={
            <SellerSidebar
              seller={seller}
              categories={categories}
              productCount={productCount}
            />
          }
        />
      </Suspense>
    </div>
  ) : (
    <div className="md:flex gap-4 mt-6">
      <div className="w-[280px] flex-shrink-0 hidden md:block">
        <SellerSidebar
          seller={seller}
          categories={categories}
          productCount={productCount}
        />
      </div>
      <div className="w-full">
        <Suspense fallback={<ProductListingSkeleton />}>
          <SellerProductListing
            seller_handle={seller_handle}
            locale={locale}
            page={page}
          />
        </Suspense>
      </div>
    </div>
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
