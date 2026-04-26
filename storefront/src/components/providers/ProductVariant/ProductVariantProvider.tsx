"use client"

import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { useRouter, usePathname } from "next/navigation"
import { getPricesForVariant } from "@/lib/helpers/get-product-price"
import {
  ProductVariantContext,
  type ColorOption,
} from "./context"

// ── Constants ────────────────────────────────────────────────────────────────

const COLOR_TITLES = ["color", "renk", "colour"]

function isColorTitle(t: string) {
  return COLOR_TITLES.includes(t.toLowerCase())
}

// ── Option map helper ────────────────────────────────────────────────────────

type OptionValueWithTitle = HttpTypes.StoreProductOptionValue & {
  option?: { title: string }
}

function getOptionMap(
  options: HttpTypes.StoreProductVariant["options"]
): Record<string, string> {
  return (options ?? []).reduce(
    (acc, opt) => {
      const title = (opt as OptionValueWithTitle).option?.title?.toLowerCase()
      if (title) acc[title] = opt.value
      return acc
    },
    {} as Record<string, string>
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────

type ProductWithMeta = HttpTypes.StoreProduct & {
  metadata?: Record<string, unknown> | null
}

type VariantWithMeta = HttpTypes.StoreProductVariant & {
  metadata?: Record<string, unknown> | null
}

interface ProductVariantProviderProps extends PropsWithChildren {
  product: ProductWithMeta
}

export function ProductVariantProvider({
  product,
  children,
}: ProductVariantProviderProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const variants = (product.variants ?? []) as VariantWithMeta[]
  const productOptions = product.options ?? []
  const colorSwatches =
    (product.metadata?.color_swatches as Record<string, string> | undefined) ??
    {}

  // ── Local state — updates immediately on click ─────────────────────────────
  // Initialize from URL params so page refresh / direct links still work.
  const [localOptions, setLocalOptions] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        if (key !== "sortBy" && key !== "page") initial[key] = value
      })
      return initial
    }
  )

  // Re-sync if the URL changes externally (back/forward navigation).
  // Guard: skip setState when values are already identical to avoid the
  // double-render that router.push() inside setOption would otherwise cause.
  useEffect(() => {
    const fromUrl: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (key !== "sortBy" && key !== "page") fromUrl[key] = value
    })
    setLocalOptions((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(fromUrl)
      if (prevKeys.length !== nextKeys.length) return fromUrl
      for (const k of nextKeys) {
        if (prev[k] !== fromUrl[k]) return fromUrl
      }
      return prev // same reference → no re-render
    })
  }, [searchParams])

  // ── setOption — immediate local update + async URL push ──────────────────
  const setOption = useCallback(
    (optionTitle: string, value: string) => {
      const key = optionTitle.toLowerCase()
      // 1. Update local state immediately → single render → no double-click
      setLocalOptions((prev) => ({ ...prev, [key]: value }))
      // 2. Push to URL asynchronously (for shareable links & refresh)
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // ── Pre-computed option maps: avoid re-running getOptionMap inside every
  //    derived callback (availableValuesForOption, isValueInStock, selectedVariant)
  const variantOptionMaps = useMemo(
    () => new Map(variants.map((v) => [v.id, getOptionMap(v.options)])),
    [variants]
  )

  // ── Derived: selectedColor ────────────────────────────────────────────────
  const selectedColor = useMemo(() => {
    for (const opt of productOptions) {
      if (isColorTitle(opt.title)) return localOptions[opt.title.toLowerCase()]
    }
    return undefined
  }, [localOptions, productOptions])

  // ── Derived: colorOptions ─────────────────────────────────────────────────
  const colorOptions = useMemo<ColorOption[]>(() => {
    const colorOpt = productOptions.find((o) => isColorTitle(o.title))
    if (!colorOpt) return []

    return (colorOpt.values ?? []).map((v) => {
      const matchingVariant = variants.find((variant) => {
        const map = getOptionMap(variant.options)
        return map[colorOpt.title.toLowerCase()] === v.value
      })
      return {
        value: v.value,
        swatchUrl: colorSwatches[v.value],
        thumbnailUrl: matchingVariant?.metadata?.thumbnail_url as
          | string
          | undefined,
      }
    })
  }, [productOptions, variants, colorSwatches])

  // ── Derived: nonColorOptionTitles ─────────────────────────────────────────
  const nonColorOptionTitles = useMemo(
    () =>
      productOptions
        .filter((o) => !isColorTitle(o.title))
        .map((o) => o.title),
    [productOptions]
  )

  // ── Derived: availableValuesForOption (cross-filter) ─────────────────────
  const availableValuesForOption = useCallback(
    (optionTitle: string): string[] => {
      const colorOpt = productOptions.find((o) => isColorTitle(o.title))
      const colorTitle = colorOpt?.title.toLowerCase()

      const candidateVariants =
        colorTitle && selectedColor
          ? variants.filter((v) => {
              const map = variantOptionMaps.get(v.id)!
              return map[colorTitle] === selectedColor
            })
          : variants

      const seen = new Set<string>()
      for (const v of candidateVariants) {
        const map = variantOptionMaps.get(v.id)!
        const val = map[optionTitle.toLowerCase()]
        if (val) seen.add(val)
      }

      const opt = productOptions.find(
        (o) => o.title.toLowerCase() === optionTitle.toLowerCase()
      )
      return (opt?.values ?? [])
        .map((ov) => ov.value)
        .filter((v) => seen.has(v))
    },
    [variants, variantOptionMaps, selectedColor, productOptions]
  )

  // ── Derived: isValueInStock ───────────────────────────────────────────────
  const isValueInStock = useCallback(
    (optionTitle: string, value: string): boolean => {
      const colorOpt = productOptions.find((o) => isColorTitle(o.title))
      const colorTitle = colorOpt?.title.toLowerCase()

      const match = variants.find((v) => {
        const map = variantOptionMaps.get(v.id)!
        const colorMatches =
          !colorTitle || !selectedColor || map[colorTitle] === selectedColor
        const valueMatches = map[optionTitle.toLowerCase()] === value
        return colorMatches && valueMatches
      })

      return (match?.inventory_quantity ?? 0) > 0
    },
    [variants, variantOptionMaps, selectedColor, productOptions]
  )

  // ── Derived: selectedVariant (exact match — ALL options must match) ───────
  const selectedVariant = useMemo<VariantWithMeta | undefined>(() => {
    if (productOptions.length === 0) {
      // Simple product (no options) → return the first variant
      return variants[0]
    }
    // All options must be present in localOptions
    const allSelected = productOptions.every(
      (opt) => !!localOptions[opt.title.toLowerCase()]
    )
    if (!allSelected) return undefined

    return variants.find((v) => {
      const map = variantOptionMaps.get(v.id)!
      return productOptions.every(
        (opt) => map[opt.title.toLowerCase()] === localOptions[opt.title.toLowerCase()]
      )
    })
  }, [variants, variantOptionMaps, localOptions, productOptions])

  // ── Derived: price & stock ────────────────────────────────────────────────
  const variantPrice = useMemo(
    () => (selectedVariant ? getPricesForVariant(selectedVariant) : null),
    [selectedVariant]
  )
  const variantStock = selectedVariant?.inventory_quantity ?? 0
  const isOutOfStock = variantStock === 0

  // hasAnyPrice: ürünün bu bölgede satılıp satılmadığını gösterir.
  // Seçim yapılmadan önce de true olmalı — herhangi bir variant'ta fiyat varsa yeterli.
  const hasAnyPrice = useMemo(() => {
    if (variantPrice !== null) return true
    return variants.some((v) => getPricesForVariant(v) !== null)
  }, [variantPrice, variants])

  // ── Derived: allOptionsSelected ──────────────────────────────────────────
  const hasVariants = productOptions.length > 0
  const allOptionsSelected = useMemo(() => {
    if (!hasVariants) return true // Simple product: always "selected"
    return productOptions.every((opt) => !!localOptions[opt.title.toLowerCase()])
  }, [hasVariants, productOptions, localOptions])

  // ── Derived: colorGalleryImages ──────────────────────────────────────────
  const colorGalleryImages = useMemo<{ id: string; url: string }[]>(() => {
    if (!selectedColor) return []
    const colorOpt = productOptions.find((o) => isColorTitle(o.title))
    const colorTitle = colorOpt?.title.toLowerCase()
    if (!colorTitle) return []

    const seen = new Set<string>()
    const images: { id: string; url: string }[] = []
    for (const v of variants) {
      const map = variantOptionMaps.get(v.id)!
      if (map[colorTitle] !== selectedColor) continue
      const url = v.metadata?.thumbnail_url as string | undefined
      if (url && !seen.has(url)) {
        seen.add(url)
        images.push({ id: `variant-${v.id}`, url })
      }
    }
    return images
  }, [variants, variantOptionMaps, selectedColor, productOptions])

  // ── Memoize context value to prevent unnecessary consumer re-renders ─────
  // Without this, every provider render creates a new object reference and
  // all useProductVariants() consumers re-render even when nothing changed.
  const ctxValue = useMemo(
    () => ({
      selectedOptions: localOptions,
      selectedColor,
      colorOptions,
      nonColorOptionTitles,
      availableValuesForOption,
      isValueInStock,
      selectedVariant,
      variantPrice,
      variantStock,
      isOutOfStock,
      hasAnyPrice,
      allOptionsSelected,
      hasVariants,
      colorGalleryImages,
      setOption,
    }),
    [
      localOptions,
      selectedColor,
      colorOptions,
      nonColorOptionTitles,
      availableValuesForOption,
      isValueInStock,
      selectedVariant,
      variantPrice,
      variantStock,
      isOutOfStock,
      hasAnyPrice,
      allOptionsSelected,
      hasVariants,
      colorGalleryImages,
      setOption,
    ]
  )

  return (
    <ProductVariantContext.Provider value={ctxValue}>
      {children}
    </ProductVariantContext.Provider>
  )
}
