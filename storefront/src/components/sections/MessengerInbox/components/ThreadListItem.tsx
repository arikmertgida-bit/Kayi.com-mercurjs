"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import type { Conversation, MessageContext, ProductContextData, VendorContextData } from "@/lib/messenger/types"

// ── Module-level caches — persist across component mounts ────────────────────
const productCache = new Map<string, ProductContextData>()
const vendorCache = new Map<string, VendorContextData>()

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "az önce"
  if (minutes < 60) return `${minutes}dk`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}sa`
  return `${Math.floor(hours / 24)}g`
}

function useThreadContext(conv: Conversation): MessageContext | null {
  const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)
  const sellerParticipant = !isProduct
    ? conv.participants.find((p) => p.userType === "SELLER")
    : undefined
  const memberId = sellerParticipant?.userId

  const [ctx, setCtx] = useState<MessageContext | null>(() => {
    if (isProduct && conv.productId && productCache.has(conv.productId)) {
      return { type: "PRODUCT", data: productCache.get(conv.productId)! }
    }
    if (!isProduct && memberId && vendorCache.has(memberId)) {
      return { type: "VENDOR", data: vendorCache.get(memberId)! }
    }
    return null
  })

  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isProduct && conv.productId) {
      const pid = conv.productId
      if (productCache.has(pid)) {
        setCtx({ type: "PRODUCT", data: productCache.get(pid)! })
        return
      }
      if (fetchedRef.current.has(pid)) return
      fetchedRef.current.add(pid)

      fetch(`/api/product/${encodeURIComponent(pid)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.product) {
            const productData: ProductContextData = {
              id: pid,
              title: data.product.title,
              thumbnail: data.product.thumbnail ?? null,
              handle: data.product.handle ?? null,
            }
            productCache.set(pid, productData)
            setCtx({ type: "PRODUCT", data: productData })
          }
        })
        .catch(() => { fetchedRef.current.delete(pid) })
    } else if (!isProduct && memberId) {
      if (vendorCache.has(memberId)) {
        setCtx({ type: "VENDOR", data: vendorCache.get(memberId)! })
        return
      }
      if (fetchedRef.current.has(memberId)) return
      fetchedRef.current.add(memberId)

      fetch(`/api/vendor-info/${encodeURIComponent(memberId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.name) {
            const vendorData: VendorContextData = {
              id: data.id ?? memberId,
              name: data.name,
              handle: data.handle ?? "",
              photo: data.photo ?? null,
              storePhoto: data.storePhoto ?? null,
            }
            vendorCache.set(memberId, vendorData)
            setCtx({ type: "VENDOR", data: vendorData })
          }
        })
        .catch(() => { fetchedRef.current.delete(memberId) })
    }
  }, [isProduct, conv.productId, memberId])

  return ctx
}

// ── Avatar fallback ───────────────────────────────────────────────────────────
function ContextAvatar({ ctx, size }: { ctx: MessageContext | null; size: number }) {
  if (ctx?.type === "PRODUCT") {
    return ctx.data.thumbnail ? (
      <Image
        src={ctx.data.thumbnail}
        alt={ctx.data.title}
        width={size}
        height={size}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg className="text-amber-400" width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    )
  }

  if (ctx?.type === "VENDOR") {
    return ctx.data.photo ? (
      <Image
        src={ctx.data.photo}
        alt={ctx.data.name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {ctx.data.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  // Loading placeholder
  return (
    <div
      className="rounded-full bg-gray-100 animate-pulse flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

interface ThreadListItemProps {
  conv: Conversation
  currentUserId: string
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}

/**
 * Single conversation row in the thread list.
 * - PRODUCT_BASED: product thumbnail + product title
 * - VENDOR_BASED:  seller logo + store name
 * Raw IDs (mem_01K...) are never shown.
 */
export function ThreadListItem({ conv, currentUserId, isActive, onOpen, onDelete }: ThreadListItemProps) {
  const ctx = useThreadContext(conv)
  const me = conv.participants.find((p) => p.userId === currentUserId)
  const unread = me?.unreadCount ?? 0
  const lastMsg = conv.messages?.[0]

  const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

  // Derive display name — never show raw ID
  const displayName =
    ctx?.type === "PRODUCT"
      ? ctx.data.title
      : ctx?.type === "VENDOR"
      ? ctx.data.name
      : null

  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <>
    <div className="relative group">
      <div
        onClick={() => onOpen(conv.id)}
        className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-all hover:bg-gray-50 cursor-pointer ${
          isActive
            ? "bg-amber-50 border-l-[3px] border-l-amber-400"
            : "border-l-[3px] border-l-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Thumbnail / Avatar — Site Logo for ADMIN_SUPPORT, ContextAvatar for all others */}
          <div className="relative flex-shrink-0">
            {conv.type === "ADMIN_SUPPORT" ? (
              <div className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
                <Image src="/Logo.png" width={80} height={26} alt="Kayı.com" className="object-contain" />
              </div>
            ) : (
              <ContextAvatar ctx={ctx} size={44} />
            )}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-sm truncate ${
                  unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                }`}
              >
                {displayName ?? "…"}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                {formatRelative(conv.updatedAt)}
              </span>
            </div>
            <p
              className={`text-xs truncate ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}
            >
              {lastMsg
                ? lastMsg.messageType === "IMAGE"
                  ? "📷 Görsel"
                  : lastMsg.content
                : "Henüz mesaj yok"}
            </p>
            {/* Context badge */}
            {isProduct ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-100">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Ürün sorusu
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Mağaza
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-dot menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
        <button
          ref={btnRef}
          onClick={(e) => {
            e.stopPropagation()
            if (menuPos) {
              setMenuPos(null)
            } else {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
            }
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all"
          aria-label="Sohbet seçenekleri"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
    </div>
    {menuPos && (
      <>
        <div className="fixed inset-0 z-[9998]" onClick={() => setMenuPos(null)} />
        <div
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setMenuPos(null); onDelete(conv.id, false) }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Sadece Benden Sil
          </button>
          <button
            onClick={() => { setMenuPos(null); onDelete(conv.id, true) }}
            className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors"
          >
            Herkesten Sil
          </button>
          <button
            onClick={() => setMenuPos(null)}
            className="w-full text-left px-4 py-2.5 text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            Kapat
          </button>
        </div>
      </>
    )}
  </>
  )
}
