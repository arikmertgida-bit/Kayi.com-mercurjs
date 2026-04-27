import { useState, useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import type { Conversation } from "../../../lib/messenger/types"

interface ThreadListItemProps {
  conv: Conversation
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
  /** Customer display name + avatar resolved by parent */
  customerDisplayName: string | null
  customerAvatarUrl: string | null
}

/**
 * Vendor Panel — single conversation row in the thread list.
 * Shows PRODUCT_BASED or VENDOR_BASED context badge next to customer info.
 */
export function ThreadListItem({
  conv,
  isActive,
  onOpen,
  onDelete,
  customerDisplayName,
  customerAvatarUrl,
}: ThreadListItemProps) {
  const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)
  const other = conv.participants?.find((p) => p.userType !== "SELLER") ?? null
  const isAdmin = other?.userType === "ADMIN"

  const name = customerDisplayName ?? other?.displayName ?? "Customer"
  const initials = (name || "?")[0]?.toUpperCase() ?? "?"
  const lastMsg = conv.messages?.[0]
  const unread = conv.participants?.find((p) => p.userType === "SELLER")?.unreadCount ?? 0

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <div className="relative group">
      <button
        onClick={() => onOpen(conv.id)}
        className={`w-full text-left p-3 border-b border-ui-border-base transition-colors hover:bg-ui-bg-base-hover ${
          isActive ? "bg-ui-bg-base border-l-2 border-l-ui-border-interactive" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {customerAvatarUrl ? (
              <img
                src={customerAvatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  isAdmin
                    ? "bg-ui-tag-purple-bg text-ui-tag-purple-text"
                    : "bg-ui-tag-blue-bg text-ui-tag-blue-text"
                }`}
              >
                {initials}
              </div>
            )}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ui-tag-blue-bg text-ui-tag-blue-text text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ui-fg-base truncate">{name}</span>
              <span className="text-xs text-ui-fg-muted flex-shrink-0 ml-1">
                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-ui-fg-muted truncate mt-0.5">
              {lastMsg
                ? lastMsg.messageType === "IMAGE"
                  ? "📷 Görsel"
                  : lastMsg.content?.slice(0, 50)
                : conv.subject ?? "Henüz mesaj yok"}
            </p>

            {/* Context badge */}
            {isProduct ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Ürün sorusu
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Mağaza sorusu
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 3-dot menu */}
      <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className={`w-7 h-7 flex items-center justify-center rounded-full text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover transition-all ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label="Sohbet seçenekleri"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute z-50 right-0 top-9 w-52 bg-ui-bg-overlay rounded-xl shadow-lg border border-ui-border-base overflow-hidden text-sm">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(conv.id, false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors"
            >
              Sadece Benden Sil
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(conv.id, true) }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-tag-red-bg text-ui-tag-red-text transition-colors"
            >
              Herkesten Sil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
