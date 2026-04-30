"use client"

import Image from "next/image"
import Link from "next/link"
import type { MessageContext } from "@/lib/messenger/types"

interface ChatHeaderProps {
  context: MessageContext | null
  locale: string
  onBack?: () => void
  onClose: () => void
  /** Fallback name when context is not yet loaded */
  fallbackName: string
  /** When true, renders admin-system specific header (icon + logo, no subtitle) */
  isAdminSupport?: boolean
}

/**
 * Chat panel header. Shows product title (PRODUCT context) or store name
 * with a clickable link to /sellers/[handle] (VENDOR context).
 * Raw IDs (mem_01K...) are never rendered.
 */
export function ChatHeader({ context, locale, onBack, onClose, fallbackName, isAdminSupport }: ChatHeaderProps) {
  const isProduct = context?.type === "PRODUCT"
  const isVendor = context?.type === "VENDOR"

  const title = isProduct
    ? context.data.title
    : isVendor
    ? context.data.name
    : fallbackName

  const subtitle = isProduct ? "Ürün hakkında soru" : isVendor ? "Mağaza sorusu" : "Mesaj bırakabilirsiniz"

  const sellerUrl = isVendor && context.data.handle ? `/${locale}/sellers/${context.data.handle}` : null

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Geri"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Context icon */}
      {isAdminSupport ? (
        <Image
          src="/icon.png"
          alt="Kayı.com"
          width={36}
          height={36}
          className="rounded-full flex-shrink-0"
        />
      ) : isProduct ? (
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
      ) : isVendor ? (
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-gray-500">
            {fallbackName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isAdminSupport ? (
          <Image src="/Logo.png" width={100} height={32} alt="Kayı.com" className="object-contain" />
        ) : sellerUrl ? (
          <Link
            href={sellerUrl}
            className="font-semibold text-gray-900 text-sm truncate block hover:text-blue-600 transition-colors"
          >
            {title}
          </Link>
        ) : (
          <p className="font-semibold text-gray-900 text-sm truncate">{title}</p>
        )}
        {!isAdminSupport && (
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        aria-label="Kapat"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
