"use client"

import { Button, Chip, Input, StarRating } from "@/components/atoms"
import { Accordion, FilterCheckboxOption, Modal } from "@/components/molecules"
import useFilters from "@/hooks/useFilters"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { cn } from "@/lib/utils"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import React, { useContext, useEffect, useState } from "react"
import { useRefinementList } from "react-instantsearch"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { FiltersContext } from "@/providers/FiltersProvider"
import { listMegaMenuCategories } from "@/lib/data/categories"
import { HttpTypes } from "@medusajs/types"
import { CollapseIcon } from "@/icons"
import { SortFilter } from "@/components/cells"

const filters = [
  { label: "5", amount: 40 },
  { label: "4", amount: 78 },
  { label: "3", amount: 0 },
  { label: "2", amount: 0 },
  { label: "1", amount: 0 },
]

export const MeiliProductSidebar = ({
  initialCategories,
}: {
  initialCategories?: HttpTypes.StoreProductCategory[]
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const { allSearchParams } = useGetAllSearchParams()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile ? (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="mb-4 w-full rounded-full border-0 bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] uppercase text-white shadow-[0_14px_28px_rgba(221,42,123,0.24)]"
      >
        Filters
      </Button>
      {isOpen && (
        <Modal heading="Filters" onClose={() => setIsOpen(false)}>
          <div className="px-4">
            <ProductListingActiveFilters />
            <CategoryFilter initialCategories={initialCategories} />
            <SortFilter />
            <SizeFilter defaultOpen={Boolean(allSearchParams.size)} />
            <ColorFilter defaultOpen={Boolean(allSearchParams.color)} />
            <ConditionFilter defaultOpen={Boolean(allSearchParams.condition)} />
          </div>
        </Modal>
      )}
    </>
  ) : (
    <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,247,251,0.96),_rgba(255,240,232,0.98))] p-3 shadow-[0_18px_44px_rgba(221,42,123,0.10)]">
      <CategoryFilter initialCategories={initialCategories} />
      <SortFilter />
      <SizeFilter />
      <ColorFilter />
      <ConditionFilter />
      {/* <RatingFilter /> */}
    </div>
  )
}

function CategoryAccordion({ category }: { category: HttpTypes.StoreProductCategory }) {
  const [isOpen, setIsOpen] = useState(false)
  const children = ((category.category_children ?? []) as HttpTypes.StoreProductCategory[])
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  const hasChildren = children.length > 0

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between py-2 px-1">
        {/* Category name → navigates to category page */}
        <Link
          href={`/categories/${category.handle}`}
          className="text-sm font-bold text-gray-900 hover:text-primary flex-1 leading-snug"
        >
          {category.name}
        </Link>
        {/* Arrow only toggles accordion, does NOT navigate */}
        {hasChildren && (
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 ml-2 cursor-pointer flex-shrink-0"
            aria-expanded={isOpen}
            aria-label="Alt kategorileri göster"
          >
            <CollapseIcon
              size={16}
              className={cn(
                "transition-transform duration-300 text-ui-fg-muted",
                isOpen ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
        )}
      </div>

      {/* Subcategories */}
      {hasChildren && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ul className="pb-2 pl-4">
            {children.map((child) => (
              <li key={child.id} className="py-1">
                <Link
                  href={`/categories/${child.handle}`}
                  className="text-sm text-ui-fg-subtle hover:text-primary hover:underline"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CategoryFilter({
  initialCategories,
}: {
  initialCategories?: HttpTypes.StoreProductCategory[]
}) {
  const pathname = usePathname()
  const [categories, setCategories] = useState<HttpTypes.StoreProductCategory[]>(
    initialCategories ?? []
  )

  const isOnCategoriesPage = pathname?.includes("/categories")

  useEffect(() => {
    if (!isOnCategoriesPage) return
    if (initialCategories && initialCategories.length > 0) return
    listMegaMenuCategories().then((cats) => {
      setCategories(cats)
    }).catch(() => {})
  }, [isOnCategoriesPage, initialCategories])

  if (!isOnCategoriesPage) return null

  return (
    <Accordion heading="Tüm Kategoriler" defaultOpen={true}>
      <ul className="px-2 min-h-[24px]">
        {categories.map((cat) => (
          <li key={cat.id}>
            <CategoryAccordion category={cat} />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function ConditionFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const { items } = useRefinementList({
    attribute: "variants.condition",
    limit: 100,
    operator: "or",
  })
  const { updateFilters, isFilterActive } = useFilters("condition")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading="Condition" defaultOpen={defaultOpen}>
      <ul className="px-4 min-h-[24px]">
        {items.map(({ label, count }) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function ColorFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const { items } = useRefinementList({
    attribute: "variants.color",
    limit: 100,
    operator: "and",
    escapeFacetValues: false,
    sortBy: ["isRefined", "count", "name"],
  })
  const { updateFilters, isFilterActive } = useFilters("color")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading="Color" defaultOpen={defaultOpen}>
      <ul className="px-4 min-h-[24px]">
        {items.map(({ label, count }) => (
          <li key={label} className="mb-4 flex items-center justify-between">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
            />
            <div
              style={{ backgroundColor: label.toLowerCase() }}
              className={cn(
                "w-5 h-5 border border-primary rounded-xs",
                Boolean(!label) && "opacity-30"
              )}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function SizeFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const { items } = useRefinementList({
    attribute: "variants.size",
    limit: 100,
    operator: "or",
  })
  const { updateFilters, isFilterActive } = useFilters("size")

  const selectSizeHandler = (size: string) => {
    updateFilters(size)
  }

  return (
    <Accordion heading="Size" defaultOpen={defaultOpen}>
      <ul className="grid grid-cols-4 mt-2 gap-2 min-h-[24px]">
        {items.map(({ label }) => (
          <li key={label} className="mb-4">
            <Chip
              selected={isFilterActive(label)}
              onSelect={() => selectSizeHandler(label)}
              value={label}
              className="w-full !justify-center !py-2 !font-normal"
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function PriceFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const ctx          = useContext(FiltersContext)
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()

  const [min, setMin] = useState(
    () => ctx ? (ctx.paramMap["min_price"] || "") : (searchParams.get("min_price") || "")
  )
  const [max, setMax] = useState(
    () => ctx ? (ctx.paramMap["max_price"] || "") : (searchParams.get("max_price") || "")
  )

  // Sync when context values change (e.g. clearAllFilters)
  useEffect(() => {
    if (!ctx) return
    setMin(ctx.paramMap["min_price"] || "")
    setMax(ctx.paramMap["max_price"] || "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.paramMap["min_price"], ctx?.paramMap["max_price"]])

  // Fallback: sync from URL on non-Meili pages
  useEffect(() => {
    if (ctx) return
    setMin(searchParams.get("min_price") || "")
    setMax(searchParams.get("max_price") || "")
  }, [searchParams, ctx])

  const applyMin = () => updateSearchParams("min_price", min || null)
  const applyMax = () => updateSearchParams("max_price", max || null)

  return (
    <Accordion heading="Price" defaultOpen={defaultOpen}>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Min"
          onChange={(e) => setMin(e.target.value)}
          onBlur={applyMin}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && applyMin()}
          value={min}
          type="number"
          className="no-arrows-number-input"
        />
        <Input
          placeholder="Max"
          onChange={(e) => setMax(e.target.value)}
          onBlur={applyMax}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && applyMax()}
          value={max}
          type="number"
          className="no-arrows-number-input"
        />
      </div>
    </Accordion>
  )
}

function RatingFilter() {
  const { updateFilters, isFilterActive } = useFilters("rating")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }

  return (
    <Accordion heading="Rating">
      <ul className="px-4">
        {filters.map(({ label }) => (
          <li
            key={label}
            className={cn("mb-4 flex items-center gap-2 cursor-pointer")}
            onClick={() => selectHandler(label)}
          >
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              label={label}
            />
            <StarRating rate={+label} />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}
