"use client"

import { Button, Input, StarRating } from "@/components/atoms"
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
  const pathname = usePathname()
  const filtersCtx = useContext(FiltersContext)
  const children = ((category.category_children ?? []) as HttpTypes.StoreProductCategory[])
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  const hasChildren = children.length > 0

  // Use setParam toggle (no navigation) on any page where FiltersContext is available.
  // FiltersProvider wraps MeiliProductsListing → sidebar is always inside it on /categories
  // and /collections pages. Elsewhere (e.g. standalone render) fall back to Link navigation.
  const isOnFilterPage = filtersCtx !== null

  // Active: filter-based (setParam) when inside FiltersProvider, URL-based otherwise.
  // paramMap["category_id"] may be a comma-separated list: "parentId,child1Id,child2Id"
  const rawParam = filtersCtx?.paramMap["category_id"] ?? ""
  const activeIds = rawParam ? rawParam.split(",") : []

  const isParentActive = isOnFilterPage
    ? activeIds.includes(category.id)
    : Boolean(pathname?.endsWith(`/categories/${category.handle}`) || pathname?.includes(`/categories/${category.handle}/`))
  const isAnyChildActive = isOnFilterPage
    ? children.some((c) => activeIds.includes(c.id))
    : children.some((c) => Boolean(pathname?.includes(`/${c.handle}`)))

  const [isOpen, setIsOpen] = useState(isAnyChildActive || isParentActive)

  const activeClass =
    "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
  const inactiveClass = "text-primary hover:bg-[#fff2f7]"
  const commonClass = "w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors block"

  // Parent click: set parent + all children IDs (comma-separated) so products from
  // every subcategory are included. Clicking again clears the filter (toggle).
  const handleParentClick = () => {
    if (!filtersCtx) return
    if (isParentActive) {
      filtersCtx.setParam("category_id", null)
    } else {
      const ids = [category.id, ...children.map((c) => c.id)]
      filtersCtx.setParam("category_id", ids.join(","))
    }
  }

  // Child click: set only the child ID. Clicking again clears.
  const handleChildClick = (childId: string) => {
    if (!filtersCtx) return
    filtersCtx.setParam("category_id", activeIds.includes(childId) ? null : childId)
  }

  return (
    <div>
      <div className="flex items-center gap-1">
        {isOnFilterPage ? (
          // Inside FiltersProvider (categories/collections pages): toggle, no navigation
          <button
            type="button"
            onClick={handleParentClick}
            className={cn(commonClass, "flex-1 font-semibold text-left", isParentActive ? activeClass : inactiveClass)}
          >
            {category.name}
          </button>
        ) : (
          // Outside FiltersProvider: navigate to category page
          <Link
            href={`/categories/${category.handle}`}
            className={cn(commonClass, "flex-1 font-semibold", isParentActive ? activeClass : inactiveClass)}
          >
            {category.name}
          </Link>
        )}
        {/* Arrow only toggles accordion, does NOT navigate */}
        {hasChildren && (
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 cursor-pointer flex-shrink-0"
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
          <ul className="pb-1 pl-3 space-y-1 pt-1">
            {children.map((child) => {
              const isChildActive = isOnFilterPage
                ? activeIds.includes(child.id)
                : Boolean(pathname?.includes(`/${child.handle}`))
              return (
                <li key={child.id}>
                  {isOnFilterPage ? (
                    <button
                      type="button"
                      onClick={() => handleChildClick(child.id)}
                      className={cn(commonClass, "text-left", isChildActive ? activeClass : inactiveClass)}
                    >
                      {child.name}
                    </button>
                  ) : (
                    <Link
                      href={`/categories/${child.handle}`}
                      className={cn(commonClass, isChildActive ? activeClass : inactiveClass)}
                    >
                      {child.name}
                    </Link>
                  )}
                </li>
              )
            })}
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

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) return
    listMegaMenuCategories().then((cats) => {
      setCategories(cats)
    }).catch(() => {})
  }, [initialCategories])

  return (
    <Accordion heading="Tüm Kategoriler" defaultOpen={true}>
      <ul className="px-2 pb-2 space-y-1 min-h-[24px]">
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

  const activeClass = "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
  const inactiveClass = "text-primary hover:bg-[#fff2f7]"

  return (
    <Accordion heading="Durum" defaultOpen={defaultOpen}>
      <ul className="px-4 pb-2 space-y-1 min-h-[24px]">
        {items.map(({ label, count }) => (
          <li key={label}>
            <button
              disabled={Boolean(!count)}
              onClick={() => updateFilters(label)}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors",
                isFilterActive(label) ? activeClass : inactiveClass,
                Boolean(!count) && "opacity-40 cursor-not-allowed"
              )}
            >
              {label}
            </button>
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

  const activeClass = "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
  const inactiveClass = "text-primary hover:bg-[#fff2f7]"

  return (
    <Accordion heading="Renk" defaultOpen={defaultOpen}>
      <ul className="px-4 pb-2 space-y-1 min-h-[24px]">
        {items.map(({ label, count }) => (
          <li key={label}>
            <button
              disabled={Boolean(!count)}
              onClick={() => updateFilters(label)}
              className={cn(
                "w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-sm transition-colors",
                isFilterActive(label) ? activeClass : inactiveClass,
                Boolean(!count) && "opacity-40 cursor-not-allowed"
              )}
            >
              <span>{label}</span>
              <span
                className="w-4 h-4 rounded-sm border border-current flex-shrink-0 ml-2"
                style={{ backgroundColor: label.toLowerCase() }}
              />
            </button>
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

  const activeClass = "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
  const inactiveClass = "text-primary hover:bg-[#fff2f7] border border-gray-200"

  return (
    <Accordion heading="Beden" defaultOpen={defaultOpen}>
      <ul className="grid grid-cols-3 gap-1.5 px-4 pb-2 min-h-[24px]">
        {items.map(({ label, count }) => (
          <li key={label}>
            <button
              disabled={Boolean(!count)}
              onClick={() => updateFilters(label)}
              className={cn(
                "w-full text-center text-sm px-1 py-1.5 rounded-sm transition-colors",
                isFilterActive(label) ? activeClass : inactiveClass,
                Boolean(!count) && "opacity-40 cursor-not-allowed"
              )}
            >
              {label}
            </button>
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
