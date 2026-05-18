"use client"

import Image from "next/image"
import Link from "next/link"
import type { VendorContextData } from "@/lib/messenger/types"
import { DEFAULT_SELLER_AVATAR } from "@/lib/utils/get-vendor-image"

interface VendorContextCardProps {
  vendor: VendorContextData
  locale: string
}

// KESİNLİKLE DEĞİŞTİRME: Storefront genelinde avatar/profil görseli mantığı bu kalıba bağlıdır.
// Satıcı banner görseli (seller.photo) sadece /seller/[handle] sayfasında kullanılır.
/**
 * Info card shown at the top of the chat panel when the conversation
 * is VENDOR_BASED. Displays the member profile photo (40×40), name,
 * and a link to the seller's storefront page.
 * vendor.storePhoto (seller.photo / banner) kasıtlı olarak kullanılmaz.
 */
export function VendorContextCard({ vendor, locale }: VendorContextCardProps) {
  const sellerUrl = vendor.handle ? `/${locale}/sellers/${vendor.handle}` : null
  // vendor.photo = member.photo (profil fotoğrafı). storePhoto (banner) avatar olarak kullanılmaz.
  const avatarSrc = vendor.photo || DEFAULT_SELLER_AVATAR

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
      {/* Member profile photo — 40×40, rounded */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0 border border-slate-200 shadow-sm">
        <Image
          src={avatarSrc}
          alt={vendor.name}
          width={40}
          height={40}
          className="w-full h-full object-cover aspect-square"
          sizes="40px"
        />
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
