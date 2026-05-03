"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMeiliSearchClient } from "@/providers/MeiliSearchProvider"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestionProduct {
  id: string
  title: string
  thumbnail: string | null
  handle: string
}

// ─── Component ────────────────────────────────────────────────────────────────

// NavbarSearchCore holds all state. It is remounted by the NavbarSearch shell
// on every route change (via key={routeKey}), which gives a guaranteed state
// reset without relying on useEffect cleanup or stale closure workarounds.
const NavbarSearchCore = () => {
  const router = useRouter()
  const params = useParams()
  const locale =
    (params?.countryCode as string) ||
    (params?.locale as string) ||
    process.env.NEXT_PUBLIC_DEFAULT_REGION ||
    "tr"

  const { host, key } = useMeiliSearchClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [popularProducts, setPopularProducts] = useState<SuggestionProduct[]>([])
  const [queryProducts, setQueryProducts] = useState<SuggestionProduct[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  // Show product cards only when user has typed ≥ 3 chars (live, not debounced)
  const liveQueryLength = query.trim().length
  const hasQuery = debouncedQuery.trim().length >= 3
  const showProducts = liveQueryLength >= 3
  // Listbox items for keyboard nav
  const listItems: string[] = hasQuery ? suggestions : popularSearches
  const displayProducts = hasQuery ? queryProducts : popularProducts

  // ── MeiliSearch fetch helpers ──────────────────────────────────────────────

  const fetchMeili = useCallback(
    async (q: string, limit: number): Promise<SuggestionProduct[]> => {
      if (!host || !key) return []
      try {
        const res = await fetch(`${host}/indexes/products/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q,
            limit,
            attributesToRetrieve: ["id", "title", "handle", "thumbnail"],
          }),
        })
        if (!res.ok) return []
        const data = (await res.json()) as {
          hits: { id: string; title: string; handle: string; thumbnail?: string }[]
        }
        return data.hits.map((h) => ({
          id: h.id,
          title: h.title,
          handle: h.handle,
          thumbnail: h.thumbnail ?? null,
        }))
      } catch {
        return []
      }
    },
    [host, key]
  )

  // Fetch top category names from MeiliSearch facets — used as popular search chips
  const fetchPopularSearches = useCallback(async (): Promise<string[]> => {
    if (!host || !key) return []
    try {
      const res = await fetch(`${host}/indexes/products/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "",
          limit: 0,
          facets: ["categories.name"],
        }),
      })
      if (!res.ok) return []
      const data = (await res.json()) as {
        facetDistribution?: Record<string, Record<string, number>>
      }
      const dist = data.facetDistribution?.["categories.name"] ?? {}
      return Object.entries(dist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name]) => name)
    } catch {
      return []
    }
  }, [host, key])

  // ── Popular searches & products on mount ──────────────────────────────────

  useEffect(() => {
    if (!host || !key) return
    let cancelled = false

    Promise.all([fetchPopularSearches(), fetchMeili("", 8)]).then(
      ([searches, products]) => {
        if (cancelled) return
        setPopularSearches(searches)
        setPopularProducts(products)
      }
    )

    return () => {
      cancelled = true
    }
  }, [host, key, fetchMeili, fetchPopularSearches])

  // ── Debounce: update debouncedQuery 300ms after keystrokes ────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setActiveIndex(-1)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }

  // ── Fetch suggestions when debouncedQuery changes ─────────────────────────

  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setQueryProducts([])
      setIsLoadingSuggestions(false)
      return
    }
    if (!host || !key) return

    let cancelled = false
    setIsLoadingSuggestions(true)

    fetchMeili(trimmed, 5).then((products) => {
      if (cancelled) return
      setSuggestions(products.map((p) => p.title))
      setQueryProducts(products)
      setIsLoadingSuggestions(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, host, key, fetchMeili])

  // ── Click-outside to close panel ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Cleanup debounce timer on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  // Full state reset is handled by NavbarSearch remounting this component on
  // every navigation via key={routeKey}. We only close the panel immediately
  // here for instant UX feedback before the remount occurs.

  const navigateTo = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      setIsFocused(false)
      if (trimmed) {
        router.push(`/${locale}/categories?query=${encodeURIComponent(trimmed)}`)
      } else {
        router.push(`/${locale}/categories`)
      }
    },
    [router, locale]
  )

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, listItems.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, -1))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && listItems[activeIndex]) {
          navigateTo(listItems[activeIndex])
        } else {
          navigateTo(query)
        }
        break
      case "Escape":
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSearchButtonClick = () => navigateTo(query)

  const handleClear = () => {
    setQuery("")
    setDebouncedQuery("")
    setSuggestions([])
    setQueryProducts([])
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showPanel = isFocused
  const showPopularSection = !hasQuery && popularSearches.length > 0
  const showSuggestionSection = hasQuery && suggestions.length > 0
  const showProductSection = showProducts && displayProducts.length > 0

  return (
    <div
      ref={containerRef}
      className="relative w-full lg:w-4/5 lg:mx-auto"
      role="search"
    >
      {/* ── Input wrapper ─────────────────────────────────────────────────── */}
      <div
        className={[
          "flex items-center gap-2 px-3 py-2 border rounded-sm bg-white",
          "transition-[border-color] duration-200 ease-in-out",
          isFocused ? "border-[#e30a17]" : "border-black",
        ].join(" ")}
      >
        {/* Search icon — inline SVG, no external request, priority paint */}
        <button
          type="button"
          aria-label="Ara"
          onClick={handleSearchButtonClick}
          className="shrink-0 text-gray-500 hover:text-black transition-colors"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.5 3a7.5 7.5 0 1 0 4.55 13.47l4.24 4.24a1 1 0 0 0 1.42-1.42l-4.24-4.24A7.5 7.5 0 0 0 10.5 3Zm-5.5 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ürün, kategori veya marka ara"
          maxLength={50}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Ürün, kategori veya marka ara"
          aria-expanded={showPanel}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
          }
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-w-0"
        />

        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <span
            className="shrink-0 w-4 h-4 border-2 border-gray-300 border-t-[#e30a17] rounded-full animate-spin"
            aria-hidden="true"
          />
        )}

        {/* Clear button */}
        {query.length > 0 && !isLoadingSuggestions && (
          <button
            type="button"
            aria-label="Aramayı temizle"
            onClick={handleClear}
            className="shrink-0 text-gray-400 hover:text-black transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Suggestion panel — absolute, never shifts layout (CLS = 0) ──── */}
      {showPanel && (
        <div
          role="dialog"
          aria-label="Arama önerileri"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#e30a17] rounded-md shadow-lg overflow-hidden"
          style={{ maxHeight: "520px", overflowY: "auto", zIndex: 99 }}
        >

          {/* ── Section 1a: Dynamic popular searches as horizontal chips ─── */}
          {showPopularSection && (
            <div className="px-3 pt-3 pb-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor"/>
                </svg>
                Popüler Aramalar
              </h2>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                role="listbox"
                aria-label="Popüler aramalar"
              >
                {popularSearches.map((term, i) => (
                  <button
                    key={term}
                    id={`search-item-${i}`}
                    role="option"
                    aria-selected={activeIndex === i}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      navigateTo(term)
                    }}
                    className={[
                      "flex-shrink-0 px-3 py-1 text-sm rounded-full border",
                      "transition-colors duration-150 whitespace-nowrap",
                      activeIndex === i
                        ? "border-[#e30a17] bg-[#e30a17] text-white"
                        : "border-gray-300 text-gray-700 hover:border-[#e30a17] hover:text-[#e30a17]",
                    ].join(" ")}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 1b: Text suggestions when typing (≥3 chars) — horizontal chips ─ */}
          {showSuggestionSection && (
            <div className={["px-3 pb-2", showPopularSection ? "pt-1" : "pt-3"].join(" ")}>
              <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.55 13.47l4.24 4.24a1 1 0 0 0 1.42-1.42l-4.24-4.24A7.5 7.5 0 0 0 10.5 3Zm-5.5 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" fill="currentColor"/>
                </svg>
                Öneriler
              </h2>
              {/* flex-wrap: chips wrap to next line instead of scrolling sideways */}
              <div
                role="listbox"
                aria-label="Öneriler"
                className="flex flex-row flex-wrap gap-2"
              >
                {listItems.map((item, i) => (
                  <button
                    key={item}
                    id={`search-item-${i}`}
                    role="option"
                    aria-selected={activeIndex === i}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      navigateTo(item)
                    }}
                    className={[
                      "flex-shrink-0 px-3 py-1 text-sm rounded-full border",
                      "transition-colors duration-150 whitespace-nowrap",
                      activeIndex === i
                        ? "border-[#e30a17] bg-[#e30a17] text-white"
                        : "border-gray-300 text-gray-700 hover:border-[#e30a17] hover:text-[#e30a17]",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 2: Product cards — shown from 3 chars (horizontal) ─ */}
          {showProductSection && (
            <div
              className={[
                "px-3 pb-3",
                (showPopularSection || showSuggestionSection)
                  ? "border-t border-gray-100 pt-2"
                  : "pt-3",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {hasQuery ? "İlgili Ürünler" : "Popüler Ürünler"}
                </h2>
                <LocalizedClientLink
                  href={hasQuery ? `/categories?query=${encodeURIComponent(debouncedQuery.trim())}` : "/categories"}
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => setIsFocused(false)}
                  className="text-xs text-[#e30a17] hover:underline font-medium"
                >
                  Tümünü Gör
                </LocalizedClientLink>
              </div>

              {/* Horizontal product card slider — scrolls right */}
              <div
                className="flex gap-3 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {displayProducts.map((product, i) => (
                  <LocalizedClientLink
                    key={product.id}
                    href={`/products/${product.handle}`}
                    onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                    onClick={() => setIsFocused(false)}
                    className="flex-shrink-0 w-24 group"
                    aria-label={product.title}
                  >
                    <div className="w-24 h-24 rounded-md overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-[#e30a17] transition-colors duration-150">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt={product.title}
                          width={96}
                          height={96}
                          loading={i < 3 ? "eager" : "lazy"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-gray-300">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-700 leading-tight line-clamp-2 group-hover:text-[#e30a17] transition-colors duration-150">
                      {product.title}
                    </p>
                  </LocalizedClientLink>
                ))}
              </div>
            </div>
          )}

          {/* ── Empty state when typing ≥3 chars but no results yet ─────── */}
          {showProducts && !showSuggestionSection && !showProductSection && !isLoadingSuggestions && debouncedQuery.trim().length >= 3 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              &ldquo;{debouncedQuery}&rdquo; için sonuç bulunamadı
            </div>
          )}

          {/* ── Fallback when MeiliSearch unavailable: show a simple prompt ─ */}
          {!showPopularSection && !showSuggestionSection && !showProductSection && !isLoadingSuggestions && liveQueryLength === 0 && (
            <div className="px-4 py-4 text-center text-sm text-gray-400">
              Aramak istediğiniz ürünü yazın
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shell Component ────────────────────────────────────────────────────────────────
// Derives a routeKey from pathname + searchParams.
// Passing it as `key` to NavbarSearchCore forces React to fully unmount and
// remount the stateful core on EVERY navigation — including same-pathname
// search-to-search transitions (e.g. ?query=foo → ?query=bar).
// This is the canonical React pattern for guaranteed state reset on route change.

export const NavbarSearch = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return <NavbarSearchCore key={`${pathname}?${searchParams.toString()}`} />
}
