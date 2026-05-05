"use client"
import { Button } from "@/components/atoms"
import {
  ColorFilter,
  ConditionFilter,
  SizeFilter,
  SortFilter,
} from "@/components/cells"
import { CloseIcon } from "@/icons"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"

import useFilters from "@/hooks/useFilters"
import { useTranslations } from "next-intl"

export const ProductSidebar = () => {
  const [filterModal, setFilterModal] = useState(false)
  const { clearAllFilters } = useFilters("")
  const t = useTranslations('listing')

  return (
    <aside className="relative w-full">
      <div
        className={cn(
          "top-0 left-0 h-full w-full rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,247,251,0.96),_rgba(255,240,232,0.98))] p-3 shadow-[0_18px_44px_rgba(221,42,123,0.10)] transition-opacity duration-100 md:relative",
          filterModal
            ? "opacity-1 z-20"
            : "opacity-0 -z-10 md:opacity-100 md:z-10"
        )}
      >
        {filterModal && (
          <div className="md:hidden">
            <div className="mb-4 flex items-center justify-between border-y border-[#f1cada] p-4">
              <h3 className="heading-md uppercase text-[#8a1d54]">Filters</h3>
              <div
                onClick={() => setFilterModal(false)}
                className="cursor-pointer"
              >
                <CloseIcon size={20} />
              </div>
            </div>
            <div className="px-2 mb-4 md:mb-0">
              <ProductListingActiveFilters />
            </div>
          </div>
        )}

        <div className="no-scrollbar h-[calc(100vh-200px)] overflow-y-scroll px-2 md:h-full md:overflow-y-auto md:px-0">
          <SortFilter />
          <SizeFilter />
          <ColorFilter />
          <ConditionFilter />
        </div>
        <div className="absolute bottom-0 left-0 flex w-full items-center gap-2 border-y border-[#f1cada] bg-[linear-gradient(90deg,_#f58529,_#dd2a7b,_#8134af)] px-4 py-4 md:hidden">
          <Button
            className="label-sm w-1/2 rounded-full bg-white/20 uppercase text-white backdrop-blur hover:bg-white/25"
            variant="tonal"
            onClick={() => clearAllFilters()}
          >
            {t('clearAll')}
          </Button>
          <Button
            className="label-sm w-1/2 rounded-full border border-white/30 bg-white text-[#c13584] uppercase hover:bg-white/90"
            onClick={() => setFilterModal(false)}
          >
            {t('viewResults')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
