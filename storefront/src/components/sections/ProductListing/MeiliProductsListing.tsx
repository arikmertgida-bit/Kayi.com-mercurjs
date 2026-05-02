"use client"

import { HttpTypes } from "@medusajs/types"
import {
  MeiliProductSidebar,
  ProductCard,
  ProductsPagination,
} from "@/components/organisms"
import { useMeiliSearchClient } from "@/providers/MeiliSearchProvider"
import { Configure, InstantSearch, useHits } from "react-instantsearch"
import { useSearchParams } from "next/navigation"
import { PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useMemo, useState } from "react"
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
      default:          return ""
    }
  }

  let facet = ""

  for (const [key, values] of Object.entries(filterMap)) {
    if (!values.length) continue
    const attr = getAttr(key)
    if (!attr) continue

    if (values.length > 1) {
      facet += ` AND (${values.map((v) => `${attr} = "${v}"`).join(" OR ")})`
    } else {
      facet += ` AND ${attr} = "${values[0]}"`
    }
  }

  return facet
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
  const { searchClient } = useMeiliSearchClient()

  if (!searchClient) return null

  return (
    <FiltersProvider initialSearch={searchParams.toString()}>
      <InstantSearch searchClient={searchClient as any} indexName="products">
        <FilteredProductsContent
          seller_handle={seller_handle}
          category_id={category_id}
          collection_id={collection_id}
          locale={locale}
          currency_code={currency_code}
          sidebarContent={sidebarContent}
        />
      </InstantSearch>
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
      {/* hitsPerPage must exceed PRODUCT_LIMIT×max-pages to support client-side pagination */}
      <Configure query={query} filters={filters} hitsPerPage={500} />
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

  // Use a stable string of IDs as the effect dependency to prevent re-firing when
  // react-instantsearch returns a new array reference with the same content.
  // instant-meilisearch returns the document primary key as `id`, not `objectID`.
  const itemIdsKey = items.map((item: any) => (item.objectID ?? item.id) as string).join(",")

  useEffect(() => {
    // Reset immediately so stale products from previous filter don't flash
    setApiProducts(null)

    if (!itemIdsKey) {
      setApiProducts([])
      return
    }

    let cancelled = false
    const ids = itemIdsKey.split(",")

    listProducts({
      countryCode: locale,
      collection_id,
      queryParams: {
        fields:
          "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id,+categories,+categories.id,+categories.metadata",
        id: ids as any,
        limit: ids.length,
      } as any,
    })
      .then(({ response }) => {
        if (!cancelled) setApiProducts(response.products)
      })
      .catch(() => {
        if (!cancelled) setApiProducts([])
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey])

  // ALL hooks must be called before any conditional returns (Rules of Hooks)
  const sortBy = (paramMap["sortBy"] || "created_at") as SortOptions

  // Build an ID→product lookup map so rendering is always driven by `items`
  // (current MeiliSearch state), never by a potentially-stale apiProducts array.
  const apiProductsMap = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProduct>()
    if (apiProducts) {
      apiProducts.forEach((p) => map.set(p.id, p))
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiProducts])

  const count = items.length || 0
  const page  = +(paramMap["page"] || 1)

  // Sort items using the API product data (for price sort); fall back to MeiliSearch order
  const sortedItems = useMemo(() => {
    if (sortBy === "created_at" || sortBy === "created_at_asc") return items
    // Collect API products in the same order as items, then sort
    const paired = items
      .map((hit: any) => ({ hit, api: apiProductsMap.get(hit.objectID ?? hit.id) }))
      .filter((x): x is { hit: any; api: HttpTypes.StoreProduct } => Boolean(x.api))
    if (paired.length < items.length) return items // not all loaded yet, keep MeiliSearch order
    const sorted = sortProducts(paired.map((x) => x.api), sortBy)
    return sorted.map((api) => items.find((h: any) => (h.objectID ?? h.id) === api.id)).filter(Boolean) as typeof items
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, apiProductsMap, sortBy])

  // Early return AFTER all hooks have been called
  if (results === undefined) return <ProductListingSkeleton />

  const pagedItems = sortedItems.slice((page - 1) * PRODUCT_LIMIT, page * PRODUCT_LIMIT)
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
          ) : (
            <div className="w-full">
              <ul className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
                {pagedItems.map((hit: any, i: number) => {
                  const apiProduct = apiProductsMap.get((hit as any).objectID ?? (hit as any).id)
                  if (!apiProduct) {
                    // API data not yet loaded for this hit → show skeleton card
                    return (
                      <div key={hit.objectID ?? hit.id} className="w-full rounded-sm border overflow-hidden">
                        <div className="aspect-square animate-pulse bg-gray-200 w-full" />
                        <div className="p-2 space-y-2">
                          <div className="h-4 animate-pulse bg-gray-200 rounded-sm w-3/4" />
                          <div className="h-4 animate-pulse bg-gray-200 rounded-sm w-1/2" />
                        </div>
                      </div>
                    )
                  }
                  return (
                    <ProductCard
                      api_product={apiProduct}
                      key={apiProduct.id}
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