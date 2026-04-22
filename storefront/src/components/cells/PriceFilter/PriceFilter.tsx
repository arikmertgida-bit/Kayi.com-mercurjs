"use client"
import { useContext, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Input } from "@/components/atoms"
import { Accordion } from "@/components/molecules"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { DollarIcon } from "@/icons"
import { FiltersContext } from "@/providers/FiltersProvider"

export const PriceFilter = () => {
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

  // Fallback: sync from URL when no context (non-Meili pages)
  useEffect(() => {
    if (ctx) return
    setMin(searchParams.get("min_price") || "")
    setMax(searchParams.get("max_price") || "")
  }, [searchParams, ctx])

  const applyMin = () => updateSearchParams("min_price", min || null)
  const applyMax = () => updateSearchParams("max_price", max || null)

  return (
    <Accordion heading="Price">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Min"
          icon={<DollarIcon size={16} />}
          onChange={(e) => setMin(e.target.value)}
          onBlur={applyMin}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && applyMin()}
          value={min}
          type="number"
          className="no-arrows-number-input"
        />
        <Input
          placeholder="Max"
          icon={<DollarIcon size={16} />}
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
