"use client"

import { useMeiliSearchClient } from "@/providers/MeiliSearchProvider"
import { InstantSearch } from "react-instantsearch"
import { MeiliProductSidebar } from "@/components/organisms"
import { HttpTypes } from "@medusajs/types"

/**
 * Kampanya sayfaları için sidebar wrapper'ı.
 * MeiliProductSidebar, useRefinementList hook'ları nedeniyle <InstantSearch> içinde
 * render edilmek zorunda. FiltersProvider kasıtlı olarak YOK — böylece CategoryAccordion
 * "isOnFilterPage = false" modunda çalışır ve kategoriler /categories/{handle} adresine
 * Link ile yönlendirir (kampanya URL'ini kirletmez).
 */
export function CampaignSidebar({
  initialCategories,
}: {
  initialCategories?: HttpTypes.StoreProductCategory[]
}) {
  const { searchClient } = useMeiliSearchClient()

  if (!searchClient) return null

  return (
    // @ts-expect-error — MeiliSearch client satisfies Algolia SearchClient interface at runtime
    <InstantSearch searchClient={searchClient} indexName="products">
      <MeiliProductSidebar initialCategories={initialCategories} />
    </InstantSearch>
  )
}
