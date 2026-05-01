"use client"

import { HttpTypes } from "@medusajs/types"
import {
  MeiliProductSidebar,
  ProductCard,
  ProductsPagination,
} from "@/components/organisms"
import { client } from "@/lib/client"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { useSearchParams } from "next/navigation"
import { PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useState } from "react"
import { listProducts } from "@/lib/data/products"
import { sortProducts } from "@/lib/helpers/sort-products"
import { SortOptions } from "@/types/product"
import { FiltersProvider, useFiltersContext } from "@/providers/FiltersProvider"

// ─── Build Meilisearch facet filter string from context state ─────────────────
function buildFacetFiltersFromMap(filterMap: Record<string, string[]>): string {
  const getAttr = (key: string): string => {
    switch (key) {
      case "size":      return "variants.size"
      case "color":     return "variants.color"
      case "condition": return "variants.condition"
      case "rating":    return "average_rating"
      default:          return ""
    }
  }

  let facet  = ""
  let rating = ""

  for (const [key, values] of Object.entries(filterMap)) {
    if (!values.length) continue
    const attr = getAttr(key)
    if (!attr) continue

    if (key === "rating") {
      const parts = values.map((v) => `${attr} >= ${v}`)
      rating += ` AND ${parts.length > 1 ? `(${parts.join(" OR ")})` : parts[0]}`
    } else {
      if (values.length > 1) {
        facet += ` AND (${values.map((v) => `${attr} = "${v}"`).join(" OR ")})`
      } else {
        facet += ` AND ${attr} = "${values[0]}"`
      }
    }
  }

  return facet + rating
}

// ─── Main export: reads useSearchParams ONCE for SSR init, wraps everything ──

export const MeiliProductsListing = ({
  category_id,
  collection_id,
  seller_handle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
  sidebarContent,
}: {
  category_id?: string | string[]
  collection_id?: string
  locale?: string
  seller_handle?: string
  currency_code: string
  sidebarContent?: React.ReactNode
}) => {
  const searchParams = useSearchParams()

  if (!client) return null

  return (
    <FiltersProvider initialSearch={searchParams.toString()}>
      <InstantSearchNext searchClient={client as any} indexName="products">
        <FilteredProductsContent
          seller_handle={seller_handle}
          category_id={category_id}
          collection_id={collection_id}
          locale={locale}
          currency_code={currency_code}
          sidebarContent={sidebarContent}
        />
      </InstantSearchNext>
    </FiltersProvider>
  )
}

// ─── Inner: reads live filter state from context (no useSearchParams) ─────────

const FilteredProductsContent = ({
  seller_handle,
  category_id,
  collection_id,
  locale,
  currency_code,
  sidebarContent,
}: {
  seller_handle?: string
  category_id?: string | string[]
  collection_id?: string
  locale?: string
  currency_code: string
  sidebarContent?: React.ReactNode
}) => {
  const { filterMap, paramMap } = useFiltersContext()

  const facetFilters  = buildFacetFiltersFromMap(filterMap)
  const query         = paramMap["query"] || ""
  const minPrice      = paramMap["min_price"]
  const maxPrice      = paramMap["max_price"]

  const priceFilter = [
    minPrice ? `variants.prices.amount >= ${minPrice}` : null,
    maxPrice ? `variants.prices.amount <= ${maxPrice}` : null,
  ]
    .filter(Boolean)
    .join(" AND ")
  const priceFilterStr = priceFilter ? ` AND ${priceFilter}` : ""

  // Support dynamic category filtering from sidebar (e.g. SellerSidebar)
  const activeCategoryId = paramMap["category_id"] || null
  const resolvedCategoryId = category_id || activeCategoryId || null

  const categoryFilter = resolvedCategoryId
    ? Array.isArray(resolvedCategoryId)
      ? `(${resolvedCategoryId.map((id) => `categories.id = "${id}"`).join(" OR ")})`
      : `categories.id = "${resolvedCategoryId}"`
    : null

  const collectionFilter =
    collection_id !== undefined ? ` AND collection.id = "${collection_id}"` : ""

  const filters = `${
    seller_handle ? `seller.handle = "${seller_handle}" AND ` : ""
  }(seller.store_status NOT EXISTS OR seller.store_status != SUSPENDED)${
    categoryFilter ? ` AND ${categoryFilter}` : ""
  }${collectionFilter} ${facetFilters}${priceFilterStr}`

  return (
    <>
      <Configure query={query} filters={filters} />
      <ProductsListing locale={locale} currency_code={currency_code} collection_id={collection_id} sidebarContent={sidebarContent} />
    </>
  )
}

// ─── Product list: reads hits from InstantSearch + page from context ──────────

const ProductsListing = ({
  locale,
  currency_code,
  collection_id,
  sidebarContent,
}: {
  locale?: string
  currency_code: string
  collection_id?: string
  sidebarContent?: React.ReactNode
}) => {
  const { paramMap } = useFiltersContext()
  const [apiProducts, setApiProducts] = useState<HttpTypes.StoreProduct[] | null>(null)
  const { items, results } = useHits()

  async function handleSetProducts() {
    if (!items.length) return
    try {
      const ids = items.map((item) => item.objectID as string)
      const { response } = await listProducts({
        countryCode: locale,
        collection_id,
        queryParams: {
          fields:
            "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id,+categories,+categories.id,+categories.metadata",
          id: ids as any,
          limit: items.length,
        } as any,
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

  const sortBy = (paramMap["sortBy"] || "created_at") as SortOptions
  const sortedApiProducts = apiProducts ? sortProducts([...apiProducts], sortBy) : null

  const count      = items.length || 0
  const page       = +(paramMap["page"] || 1)
  const pagedItems = items.slice((page - 1) * PRODUCT_LIMIT, page * PRODUCT_LIMIT)
  const pagedApiProducts = sortedApiProducts
    ? sortedApiProducts.slice((page - 1) * PRODUCT_LIMIT, page * PRODUCT_LIMIT)
    : null
  const pages      = Math.ceil(count / PRODUCT_LIMIT) || 1

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center">
        <div className="my-4 label-md">{`${count} listings`}</div>
      </div>
      <div className="md:flex gap-4">
        <div className="w-[280px] flex-shrink-0 hidden md:block" style={{ backgroundColor: 'rgb(240, 225, 243)', borderRadius: '8px', padding: '8px' }}>
          {sidebarContent ?? <MeiliProductSidebar />}
        </div>
        <div className="w-full">
          {!items.length ? (
            <div className="text-center w-full my-10">
              <h2 className="uppercase text-primary heading-lg">no results</h2>
              <p className="mt-4 text-lg">
                Sorry, we can&apos;t find any results for your criteria
              </p>
            </div>
          ) : pagedApiProducts === null ? (
            <div className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
              {pagedItems.map((_, i) => (
                <div key={i} className="w-full rounded-sm border overflow-hidden">
                  <div className="aspect-square animate-pulse bg-gray-200 w-full" />
                  <div className="p-2 space-y-2">
                    <div className="h-4 animate-pulse bg-gray-200 rounded-sm w-3/4" />
                    <div className="h-4 animate-pulse bg-gray-200 rounded-sm w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <ul className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
                {pagedApiProducts.map((apiProduct: any, i: number) => {
                  const hit = items.find(
                    (h: any) => h.objectID === apiProduct.id || h.handle === apiProduct.handle
                  )
                  if (!hit) return null
                  return (
                    <ProductCard
                      api_product={apiProduct}
                      key={String(apiProduct.id || apiProduct.handle)}
                      product={hit}
                      isEager={i < 4}
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