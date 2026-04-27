"use client"

import Image from "next/image"
import Link from "next/link"
import type { ProductContextData } from "@/lib/messenger/types"

interface ProductContextCardProps {
  product: ProductContextData
  locale: string
}

/**
 * Sticky card shown at the top of the chat panel when the conversation
 * is PRODUCT_BASED. Displays product thumbnail, title, and links to the
 * product detail page on the storefront.
 */
export function ProductContextCard({ product, locale }: ProductContextCardProps) {
  const productUrl = product.handle ? `/${locale}/products/${product.handle}` : null

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
      {/* Product thumbnail */}
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-amber-100 shadow-sm">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            width={44}
            height={44}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wide mb-0.5">
          Ürün hakkında soru
        </p>
        {productUrl ? (
          <Link
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-800 hover:text-amber-600 hover:underline truncate block transition-colors leading-tight"
          >
            {product.title}
            <span className="ml-1 text-amber-400 text-xs">↗</span>
          </Link>
        ) : (
          <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
            {product.title}
          </p>
        )}
      </div>

      {/* Badge */}
      <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-200">
        Ürün
      </span>
    </div>
  )
}
