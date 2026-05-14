"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

/**
 * Shape of the metadata payload attached to PROMOTION-type messages.
 * Sent by backend/src/subscribers/promotion-follower-broadcast.ts
 */
interface PromotionProduct {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

interface PromotionMetadata {
  [key: string]: unknown
  type: "promotion_broadcast"
  sellerName: string
  sellerHandle: string | null
  promotionCode: string
  discountValue: number | null
  discountType: "percentage" | "fixed" | string | null
  campaignName: string | null
  products: PromotionProduct[]
}

function isPromotionMetadata(val: Record<string, unknown>): val is PromotionMetadata {
  return (
    val.type === "promotion_broadcast" &&
    typeof val.sellerName === "string" &&
    typeof val.promotionCode === "string" &&
    Array.isArray((val as PromotionMetadata).products)
  )
}

interface PromotionMessageCardProps {
  metadata: Record<string, unknown>
  /** Fallback plain-text content shown if metadata is malformed. */
  fallbackContent: string
}

/**
 * Renders a rich promotion card with a fully responsive product slider.
 *
 * Viewport column grid (all products shown, arrows + touch scroll to navigate):
 *   < 1200px  → 3 per row   (mobile / tablet)
 *   1200–1439 → 4 per row
 *   1440–1599 → 5 per row
 *   ≥ 1600px  → 6 per row
 *
 * Web vitals:
 *  - CLS : aspect-square containers — height is layout-determined, never shifts
 *  - LCP : first 3 images get priority={true}, rest are lazy
 *  - INP : scrollBy is browser-native; scroll + resize handlers throttled via rAF
 *
 * React rules: ALL hooks declared before any conditional return.
 */
export function PromotionMessageCard({ metadata, fallbackContent }: PromotionMessageCardProps) {
  const params = useParams()
  const locale = (params?.locale as string) ?? "tr"

  // ── All hooks before any conditional return ──────────────────────────────
  const [copied, setCopied] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // Tracks whether the slider overflows at the current viewport width.
  // Initial value optimistically assumes overflow for 2+ products so arrows
  // are present on first paint; corrected after mount (no CLS because arrows
  // are inside the card, not layout-affecting).
  const [hasOverflow, setHasOverflow] = useState(
    isPromotionMetadata(metadata) && (metadata as PromotionMetadata).products.length > 1
  )

  // rAF-throttled tracker: updates arrow state + overflow flag on scroll/resize.
  const updateArrows = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = sliderRef.current
      if (!el) return
      setHasOverflow(el.scrollWidth > el.clientWidth + 4)
      setAtStart(el.scrollLeft <= 4)
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4)
    })
  }, [])

  // Mount: initial measurement + subscribe to viewport resize so column count
  // changes (3→4→5→6) are reflected in hasOverflow without page reload.
  useEffect(() => {
    updateArrows()
    window.addEventListener("resize", updateArrows, { passive: true })
    return () => window.removeEventListener("resize", updateArrows)
  }, [updateArrows])

  // Advance by exactly one card width — browser-native smooth scroll, zero JS animation.
  const slide = useCallback((dir: 1 | -1) => {
    const el = sliderRef.current
    if (!el) return
    const firstChild = el.firstElementChild as HTMLElement | null
    const step = firstChild ? firstChild.offsetWidth + 8 : el.clientWidth / 3 // gap-2 = 8px
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }, [])

  const handleCopy = useCallback(async () => {
    const code = isPromotionMetadata(metadata) ? metadata.promotionCode : ""
    try { await navigator.clipboard.writeText(code) } catch { /* permission denied */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [metadata])

  // ── Guard (after all hooks) ──────────────────────────────────────────────
  if (!isPromotionMetadata(metadata)) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          {fallbackContent}
        </span>
      </div>
    )
  }

  const {
    sellerName,
    sellerHandle,
    promotionCode,
    discountValue,
    discountType,
    campaignName,
    products,
  } = metadata

  const discountLabel =
    discountType === "percentage" && discountValue != null
      ? `%${discountValue} İndirim`
      : discountType === "fixed" && discountValue != null
        ? `₺${discountValue} İndirim`
        : "İndirim"

  const storeUrl = sellerHandle ? `/${locale}/sellers/${sellerHandle}` : null

  // Responsive item widths — calculated so exactly n items fill the container width.
  // Formula: calc(100%/n − gap*(n−1)/n) = calc(X% − Ypx)
  //   gap-2 = 8px per gap slot
  //   3 items: calc(33.333% − 5.33px)  → w-[calc(33.333%-5.5px)]
  //   4 items: calc(25%     − 6px)     → min-[1200px]:w-[calc(25%-6px)]
  //   5 items: calc(20%     − 6.4px)   → min-[1440px]:w-[calc(20%-6.5px)]
  //   6 items: calc(16.667% − 6.67px)  → min-[1600px]:w-[calc(16.667%-6.7px)]
  const itemCls =
    products.length === 1
      ? "flex-shrink-0 snap-start w-full"
      : products.length === 2
        ? "flex-shrink-0 snap-start w-[calc(50%-4px)]"
        : "flex-shrink-0 snap-start w-[calc(33.333%-5.5px)] min-[1200px]:w-[calc(25%-6px)] min-[1440px]:w-[calc(20%-6.5px)] min-[1600px]:w-[calc(16.667%-6.7px)]"

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden my-2">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3">
        <div>
          <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-0.5">
            Promosyon
          </p>
          <span className="text-white text-base font-bold">{sellerName}</span>
          {campaignName && (
            <p className="text-white/80 text-xs mt-0.5">{campaignName}</p>
          )}
        </div>
        <span className="bg-white text-rose-500 text-sm font-extrabold px-3 py-1 rounded-full shadow-sm">
          {discountLabel}
        </span>
      </div>

      {/* ── Product Slider ──────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="relative px-3 pt-3 pb-2">

          {/* Scroll track: snap + overflow-x-auto = touch swipe + mouse wheel + arrows */}
          <div
            ref={sliderRef}
            role="list"
            aria-label={`${products.length} promosyon ürünü`}
            onScroll={updateArrows}
            className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {products.map((product, i) => {
              const productUrl = product.handle
                ? `/${locale}/products/${product.handle}`
                : null

              const card = (
                <div role="listitem" className={`${itemCls} flex flex-col gap-1 group`}>
                  {/* aspect-square → height is CSS-derived → CLS = 0 */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 relative border border-gray-200">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        priority={i < 3}
                        sizes="(max-width: 1199px) 30vw, (max-width: 1439px) 12vw, (max-width: 1599px) 10vw, 8vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-[9px]">Resim yok</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 text-center leading-tight line-clamp-2">
                    {product.title}
                  </p>
                </div>
              )

              return productUrl ? (
                <Link key={product.id} href={productUrl} className="contents">
                  {card}
                </Link>
              ) : (
                <div key={product.id} className="contents">
                  {card}
                </div>
              )
            })}
          </div>

          {/* Arrow navigation — visible only when content actually overflows */}
          {hasOverflow && (
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-gray-400 tabular-nums pl-0.5">
                {products.length} ürün
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => slide(-1)}
                  disabled={atStart}
                  aria-label="Önceki ürünler"
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 select-none ${
                    atStart
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-rose-200 text-rose-500 hover:bg-rose-50 active:scale-95"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => slide(1)}
                  disabled={atEnd}
                  aria-label="Sonraki ürünler"
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 select-none ${
                    atEnd
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-rose-200 text-rose-500 hover:bg-rose-50 active:scale-95"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Coupon code + copy ────────────────────────────────────────────── */}
      <div className="relative px-4 pb-4">
        {/* Slide-up toast — aria-live for screen readers */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={`absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-all duration-300 pointer-events-none whitespace-nowrap ${
            copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          İndirim Kodu Kopyalandı
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-2.5">
          <span className="flex-1 font-mono text-sm font-bold tracking-widest text-gray-800 select-all">
            {promotionCode}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap ${
              copied
                ? "bg-emerald-500 text-white border border-emerald-500"
                : "text-rose-500 border border-rose-200 hover:bg-rose-50"
            }`}
          >
            {copied ? "✓ Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>

      {/* ── Store link ──────────────────────────────────────────────────────── */}
      {storeUrl && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          <Link
            href={storeUrl}
            className="block text-center text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
          >
            Mağazayı Görüntüle →
          </Link>
        </div>
      )}
    </div>
  )
}
