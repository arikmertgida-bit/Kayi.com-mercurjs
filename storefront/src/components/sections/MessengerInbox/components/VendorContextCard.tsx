"use client"

import Image from "next/image"
import Link from "next/link"
import type { VendorContextData } from "@/lib/messenger/types"

interface VendorContextCardProps {
  vendor: VendorContextData
  locale: string
}

/**
 * Info card shown at the top of the chat panel when the conversation
 * is VENDOR_BASED. Displays the store logo, name, and a link to the
 * seller's storefront page.
 */
export function VendorContextCard({ vendor, locale }: VendorContextCardProps) {
  const sellerUrl = vendor.handle ? `/${locale}/sellers/${vendor.handle}` : null

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
      {/* Store logo */}
      <div className="w-11 h-11 rounded-full overflow-hidden bg-white flex-shrink-0 border border-slate-200 shadow-sm">
        {vendor.photo ?? vendor.storePhoto ? (
          <Image
            src={(vendor.photo ?? vendor.storePhoto)!}
            alt={vendor.name}
            width={44}
            height={44}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500 font-bold text-base">
            {vendor.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Store info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">
          Mağaza sorusu
        </p>
        {sellerUrl ? (
          <Link
            href={sellerUrl}
            className="text-sm font-semibold text-gray-800 hover:text-blue-600 hover:underline truncate block transition-colors leading-tight"
          >
            {vendor.name}
            <span className="ml-1 text-blue-400 text-xs">↗</span>
          </Link>
        ) : (
          <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{vendor.name}</p>
        )}
      </div>

      {/* Badge */}
      <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100">
        Mağaza
      </span>
    </div>
  )
}
