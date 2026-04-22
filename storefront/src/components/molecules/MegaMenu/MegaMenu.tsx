"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { HamburgerMenuIcon, ArrowRightIcon } from "@/icons"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"

type Category = HttpTypes.StoreProductCategory & {
  category_children?: HttpTypes.StoreProductCategory[]
  thumbnail?: string | null
  metadata?: Record<string, unknown>
}

export const MegaMenu = ({ categories }: { categories: Category[] }) => {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? "")

  const activeCategory = categories.find((c) => c.id === activeId) ?? categories[0]

  return (
    <div className="group relative">
      {/* Trigger */}
      <div className="flex items-center gap-2 label-md uppercase px-4 cursor-pointer select-none">
        <HamburgerMenuIcon size={18} />
        <span>Tüm Kategoriler</span>
      </div>

      {/*
        Panel — always in DOM, shown via CSS group-hover only.
        position:absolute → zero layout shift (CLS = 0).
        opacity + pointer-events → no paint cost when hidden.
      */}
      <div
        className={cn(
          "absolute top-full -left-6 z-50 flex bg-white border shadow-lg",
          "opacity-0 pointer-events-none",
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          "transition-opacity duration-150"
        )}
        style={{ minWidth: 1024 }}
        aria-hidden="true"
      >
        {/* Left column: parent categories */}
        <ul className="w-52 border-r py-2 max-h-[440px] overflow-y-auto shrink-0">
          {categories.map((cat) => (
            <li
              key={cat.id}
              onMouseEnter={() => setActiveId(cat.id)}
            >
              <LocalizedClientLink
                href={`/categories/${cat.handle}`}
                className={cn(
                  "flex items-center justify-between px-4 py-1.5 label-md uppercase w-full",
                  "hover:text-primary transition-colors",
                  activeCategory?.id === cat.id && "text-primary bg-gray-50"
                )}
              >
                <span>{cat.name}</span>
                <ArrowRightIcon size={14} className="shrink-0 text-gray-400" />
              </LocalizedClientLink>
            </li>
          ))}
        </ul>

        {/* Right panel: subcategories + optional image */}
        {activeCategory && (
          <div className="flex flex-1 min-h-[200px]">
            {/* Sub-category links — single column, compact */}
            <div className="flex-1 p-4">
              <p className="label-md uppercase text-gray-400 mb-2">
                {activeCategory.name}
              </p>
              <ul className="flex flex-col">
                {activeCategory.category_children?.map((sub) => (
                  <li key={sub.id}>
                    <LocalizedClientLink
                      href={`/categories/${sub.handle}`}
                      className="block py-1 text-sm text-gray-700 hover:text-primary hover:underline"
                    >
                      {sub.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Category image — stored in metadata.thumbnail from Medusa admin */}
            {activeCategory.metadata?.thumbnail && (
              <div className="shrink-0 relative self-stretch overflow-hidden rounded-[10px] m-2" style={{ width: 600 }}>
                <Image
                  src={activeCategory.metadata.thumbnail as string}
                  alt={activeCategory.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
