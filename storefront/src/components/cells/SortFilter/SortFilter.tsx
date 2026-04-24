"use client"
import { useContext } from "react"
import { useSearchParams } from "next/navigation"

import { Accordion } from "@/components/molecules"
import { FilterCheckboxOption } from "@/components/molecules"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { FiltersContext } from "@/providers/FiltersProvider"

const SORT_OPTIONS = [
  { label: "Fiyat: Düşük → Yüksek", value: "price_asc" },
  { label: "Fiyat: Yüksek → Düşük", value: "price_desc" },
  { label: "Yeni Ürün → Eski Ürün", value: "created_at" },
  { label: "Eski Ürün → Yeni Ürün", value: "created_at_asc" },
]

export const SortFilter = () => {
  const ctx = useContext(FiltersContext)
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()

  const activeSortBy = ctx
    ? ctx.paramMap["sortBy"] || ""
    : searchParams.get("sortBy") || ""

  const selectHandler = (value: string) => {
    updateSearchParams("sortBy", activeSortBy === value ? null : value)
  }

  return (
    <Accordion heading="Ürünleri Sırala" defaultOpen={true}>
      <ul className="px-4 min-h-[24px]">
        {SORT_OPTIONS.map(({ label, value }) => (
          <li key={value} className="mb-3">
            <FilterCheckboxOption
              checked={activeSortBy === value}
              onCheck={() => selectHandler(value)}
              label={label}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}
