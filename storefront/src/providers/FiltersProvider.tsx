"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

/** Multi-value filter keys (comma-separated in URL) */
const FILTER_KEYS = new Set(["size", "color", "condition", "sale", "rating"])

export type FilterMap = Record<string, string[]>   // { color: ['Red', 'Blue'], size: ['M'] }
export type ParamMap  = Record<string, string>     // { min_price: '100', query: 'shirt' }

export interface FiltersContextValue {
  filterMap: FilterMap
  paramMap: ParamMap
  toggleFilter: (key: string, value: string) => void
  isFilterActive: (key: string, value: string) => boolean
  clearAllFilters: () => void
  setParam: (key: string, value: string | null) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const FiltersContext = createContext<FiltersContextValue | null>(null)

/** Throws if called outside FiltersProvider — use only inside the Meili path. */
export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error("useFiltersContext must be inside <FiltersProvider>")
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSearch(search: string): { filterMap: FilterMap; paramMap: ParamMap } {
  const sp = new URLSearchParams(search)
  const filterMap: FilterMap = {}
  const paramMap: ParamMap   = {}
  sp.forEach((value, key) => {
    if (FILTER_KEYS.has(key)) {
      filterMap[key] = value.split(",").filter(Boolean)
    } else {
      paramMap[key] = value
    }
  })
  return { filterMap, paramMap }
}

function buildSearchString(fm: FilterMap, pm: ParamMap): string {
  const sp = new URLSearchParams()
  Object.entries(fm).forEach(([k, vs]) => { if (vs.length) sp.set(k, vs.join(",")) })
  Object.entries(pm).forEach(([k, v])  => { if (v)          sp.set(k, v) })
  return sp.toString()
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FiltersProvider({
  children,
  initialSearch = "",
}: {
  children: React.ReactNode
  initialSearch?: string
}) {
  const pathname = usePathname()

  const init = parseSearch(initialSearch)
  const [filterMap, setFilterMap] = useState<FilterMap>(init.filterMap)
  const [paramMap,  setParamMap]  = useState<ParamMap>(init.paramMap)

  // Stable refs so callbacks never close over stale state
  const fmRef = useRef(filterMap)
  const pmRef = useRef(paramMap)
  fmRef.current = filterMap
  pmRef.current = paramMap

  /** Push URL without triggering Next.js navigation (no Suspense flash). */
  const syncUrl = useCallback(
    (fm: FilterMap, pm: ParamMap) => {
      const qs  = buildSearchString(fm, pm)
      const url = qs ? `${pathname}?${qs}` : pathname
      window.history.replaceState(window.history.state ?? {}, "", url)
    },
    [pathname]
  )

  /** Restore context when user presses Back / Forward. */
  useEffect(() => {
    const onPopState = () => {
      const { filterMap: fm, paramMap: pm } = parseSearch(window.location.search.slice(1))
      setFilterMap(fm)
      setParamMap(pm)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      setFilterMap((prev) => {
        const current = prev[key] ?? []
        const next    = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        const fm = { ...prev, [key]: next }
        syncUrl(fm, pmRef.current)
        return fm
      })
    },
    [syncUrl]
  )

  // Read directly from latest filterMap state (no stale-closure risk)
  const isFilterActive = useCallback(
    (key: string, value: string) => {
      return (fmRef.current[key] ?? []).includes(value)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterMap]
  )

  const clearAllFilters = useCallback(() => {
    setFilterMap({})
    setParamMap({})
    window.history.replaceState(window.history.state ?? {}, "", pathname)
  }, [pathname])

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParamMap((prev) => {
        const pm = { ...prev }
        if (value === null || value === "") delete pm[key]
        else pm[key] = value
        syncUrl(fmRef.current, pm)
        return pm
      })
    },
    [syncUrl]
  )

  return (
    <FiltersContext.Provider
      value={{ filterMap, paramMap, toggleFilter, isFilterActive, clearAllFilters, setParam }}
    >
      {children}
    </FiltersContext.Provider>
  )
}
