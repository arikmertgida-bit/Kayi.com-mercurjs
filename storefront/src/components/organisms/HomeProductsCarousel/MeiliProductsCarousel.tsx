"use client"

import { HttpTypes } from "@medusajs/types"
import { HomeSlider } from "./HomeSlider"
import { client } from "@/lib/client"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { listProducts } from "@/lib/data/products"
import { useEffect, useState } from "react"
import { getProductPrice } from "@/lib/helpers/get-product-price"

export const MeiliProductsCarousel = ({
  locale,
  seller_handle,
  currency_code,
}: {
  locale: string
  seller_handle?: string
  currency_code: string
}) => {
  const filters = `${
    seller_handle
      ? `seller.handle = "${seller_handle}" AND `
      : ""
  }seller.store_status != SUSPENDED AND variants.prices.currency_code = "${currency_code}"`

  return (
    <InstantSearchNext searchClient={client as any} indexName="products">
      <Configure hitsPerPage={10} filters={filters} />
      <ProductsListing locale={locale} />
    </InstantSearchNext>
  )
}

const ProductsListing = ({ locale }: { locale: string }) => {
  const [prod, setProd] = useState<HttpTypes.StoreProduct[] | null>(null)
  const { items } = useHits()

  useEffect(() => {
    listProducts({
      countryCode: locale,
      queryParams: {
        limit: 99999,
        fields:
          "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id",
      },
    }).then(({ response }) => {
      setProd(response.products)
    })
  }, [])

  const resolvedProducts = items
    .map((hit) => {
      const apiProd = prod?.find((p) => {
        const { cheapestPrice } = getProductPrice({ product: p })
        return p.id === hit.objectID && Boolean(cheapestPrice)
      })
      return apiProd ?? null
    })
    .filter((p): p is HttpTypes.StoreProduct => p !== null)

  if (!items.length) {
    return (
      <div className="text-center w-full my-10">
        <h2 className="uppercase text-primary heading-lg">no results</h2>
        <p className="mt-4 text-lg">
          Sorry, we can&apos;t find any results for your criteria
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <HomeSlider heading="" initialProducts={resolvedProducts} />
    </div>
  )
}
