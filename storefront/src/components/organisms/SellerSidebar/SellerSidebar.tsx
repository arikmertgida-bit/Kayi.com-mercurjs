"use client"

import { useSearchParams } from "next/navigation"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { Accordion } from "@/components/molecules"
import { SellerProps } from "@/types/seller"
import { useState } from "react"

type Category = { id: string; name: string; handle: string }

interface SellerSidebarProps {
  seller: SellerProps
  categories: Category[]
  productCount: number
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`w-4 h-4 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-xs text-secondary ml-1">
        {rating > 0 ? `${rating.toFixed(1)}` : "—"}
      </span>
    </div>
  )
}

export function SellerSidebar({ seller, categories, productCount }: SellerSidebarProps) {
  const searchParams = useSearchParams()
  const updateSearchParam = useUpdateSearchParams()

  const [activeCategory, setActiveCategory] = useState(searchParams.get("category_id") || "")
  const [activeSort, setActiveSort] = useState(searchParams.get("sort") || "")

  const reviewCount = seller.reviews?.filter((r) => r !== null).length || 0
  const rating =
    reviewCount > 0
      ? seller.reviews!
          .filter((r) => r !== null)
          .reduce((sum: number, r: any) => sum + (r?.rating || 0), 0) /
        reviewCount
      : 0

  const isActive = seller.store_status === "ACTIVE"

  const sortOptions = [
    { label: "En Yeniler", value: "created_at_desc" },
    { label: "Fiyat: Düşükten Yükseğe", value: "price_asc" },
    { label: "Fiyat: Yüksekten Düşüğe", value: "price_desc" },
  ]

  return (
    <aside className="hidden w-full md:block rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,247,251,0.96),_rgba(255,240,232,0.98))] p-3 shadow-[0_18px_44px_rgba(221,42,123,0.10)]">
      {/* Store Info Card */}
      <div className="mb-4 rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-[0_12px_30px_rgba(221,42,123,0.08)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-primary">Mağaza Bilgileri</span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-[linear-gradient(90deg,_rgba(245,133,41,0.14),_rgba(221,42,123,0.12))] px-2 py-0.5 text-xs text-[#c13584]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
              Onaylı
            </span>
          )}
        </div>
        <StarDisplay rating={rating} />
        <p className="text-xs text-secondary mt-1">{reviewCount} değerlendirme</p>
        <p className="text-xs text-secondary mt-1">{productCount} ürün</p>
      </div>

      {/* Sort */}
      <Accordion heading="Sıralama" defaultOpen>
        <ul className="px-4 pb-2 space-y-2">
          {sortOptions.map((opt) => (
            <li key={opt.value}>
              <button
                onClick={() => {
                  const next = activeSort === opt.value ? "" : opt.value
                  setActiveSort(next)
                  updateSearchParam("sort", next || null)
                }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors ${
                  activeSort === opt.value
                    ? "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
                    : "text-primary hover:bg-[#fff2f7]"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </Accordion>

      {/* Category Filter */}
      {categories.length > 0 && (
        <Accordion heading="Kategoriler" defaultOpen>
          <ul className="px-4 pb-2 space-y-1">
            <li>
              <button
                onClick={() => {
                  setActiveCategory("")
                  updateSearchParam("category_id", null)
                }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors ${
                  !activeCategory
                    ? "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
                    : "text-primary hover:bg-[#fff2f7]"
                }`}
              >
                Tümü
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => {
                    const next = activeCategory === cat.id ? "" : cat.id
                    setActiveCategory(next)
                    updateSearchParam("category_id", next || null)
                  }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors ${
                    activeCategory === cat.id
                      ? "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_10px_20px_rgba(221,42,123,0.20)]"
                      : "text-primary hover:bg-[#fff2f7]"
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </Accordion>
      )}
    </aside>
  )
}