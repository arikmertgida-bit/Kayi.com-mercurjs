"use client"

import { HttpTypes } from "@medusajs/types"
import {
  MeiliProductSidebar,
  ProductCard,
  ProductListingActiveFilters,
  ProductsPagination,
} from "@/components/organisms"
import { client } from "@/lib/client"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { useSearchParams } from "next/navigation"
import { getFacedFilters } from "@/lib/helpers/get-faced-filters"
import { PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useState } from "react"
import { listProducts } from "@/lib/data/products"

export const MeiliProductsListing = ({
  category_id,
  collection_id,
  seller_handle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
}: {
  category_id?: string | string[]
  collection_id?: string
  locale?: string
  seller_handle?: string
  currency_code: string
}) => {
  const searchParamas = useSearchParams()

  const facetFilters: string = getFacedFilters(searchParamas)
  const query: string = searchParamas.get("query") || ""

  const categoryFilter = category_id
    ? Array.isArray(category_id)
      ? `(${category_id.map((id) => `categories.id = "${id}"`).join(" OR ")})`
      : `categories.id = "${category_id}"`
    : null

  const filters = `${
    seller_handle
      ? `seller.handle = "${seller_handle}" AND `
      : ""
  }seller.store_status != SUSPENDED${
    categoryFilter
      ? ` AND ${categoryFilter}${
          collection_id !== undefined
            ? ` AND collection.id = "${collection_id}"`
            : ""
        } ${facetFilters}`
      : ` ${facetFilters}`
  }`

  if (!client) return null

  return (
    <InstantSearchNext searchClient={client} indexName="products">
      <Configure query={query} filters={filters} />
      <ProductsListing
        locale={locale}
        currency_code={currency_code}
        filters={filters}
      />
    </InstantSearchNext>
  )
}

const ProductsListing = ({
  locale,
  currency_code,
  filters,
}: {
  locale?: string
  currency_code: string
  filters: string
}) => {
  const [apiProducts, setApiProducts] = useState<
    HttpTypes.StoreProduct[] | null
  >(null)
  const { items, results } = useHits()

  const searchParamas = useSearchParams()

  async function handleSetProducts() {
    if (!items.length) return
    try {
      const { response } = await listProducts({
        countryCode: locale,
        queryParams: {
          fields:
            "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id",
          handle: items.map((item) => item.handle as string),
          limit: items.length,
        },
      })

      setApiProducts(response.products)
    } catch (error) {
      console.error("handleSetProducts error:", error)
      setApiProducts([])
    }
  }

  useEffect(() => {
    handleSetProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  if (results === undefined) return <ProductListingSkeleton />

  const page: number = +(searchParamas.get("page") || 1)
  // Use items directly for count/pagination; only render cards when apiProducts loaded
  const pagedItems = items.slice(
    (page - 1) * PRODUCT_LIMIT,
    page * PRODUCT_LIMIT
  )

  const count = items.length || 0
  const pages = Math.ceil(count / PRODUCT_LIMIT) || 1

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center">
        <div className="my-4 label-md">{`${count} listings`}</div>
      </div>
      <div className="hidden md:block">
        <ProductListingActiveFilters />
      </div>
      <div className="md:flex gap-4">
        <div className="w-[280px] flex-shrink-0 hidden md:block">
          <MeiliProductSidebar />
        </div>
        <div className="w-full">
          {!items.length ? (
            <div className="text-center w-full my-10">
              <h2 className="uppercase text-primary heading-lg">no results</h2>
              <p className="mt-4 text-lg">
                Sorry, we can&apos;t find any results for your criteria
              </p>
            </div>
          ) : apiProducts === null ? (
            <div className="flex flex-wrap gap-4">
              {pagedItems.map((_, i) => (
                <div key={i} className="w-full lg:w-[calc(25%-1rem)] min-w-[250px] aspect-square animate-pulse bg-gray-200 rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="w-full">
              <ul className="flex flex-wrap gap-4">
                {pagedItems.map((hit) => {
                  const apiProduct = apiProducts.find(
                    (p: any) => p.id === hit.objectID || p.handle === hit.handle
                  )
                  if (!apiProduct) return null
                  return (
                    <ProductCard
                      api_product={apiProduct}
                      key={String(hit.objectID || hit.handle)}
                      product={hit}
                    />
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
      <ProductsPagination pages={pages} />
    </div>
  )
}