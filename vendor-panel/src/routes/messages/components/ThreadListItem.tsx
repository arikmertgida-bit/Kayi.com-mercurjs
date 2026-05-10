import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { languages } from "../../../i18n/languages"
import { fetchQuery } from "../../../lib/client"
import type { Conversation, ConversationMetadata } from "../../../lib/messenger/types"

// ── Customer info lookup ──────────────────────────────────────────────────────

interface CustomerInfo {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

function useCustomerInfo(customerId: string | undefined) {
  const [info, setInfo] = useState<CustomerInfo | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!customerId) return
    if (!customerId.startsWith("cus_")) return
    if (fetchedRef.current.has(customerId)) return
    fetchedRef.current.add(customerId)

    fetchQuery<{ customer: CustomerInfo }>(`/vendor/customers/${customerId}`, { method: "GET" })
      .then(({ customer }) => setInfo(customer))
      .catch(() => { fetchedRef.current.delete(customerId) })

    fetchQuery<{ avatar_url: string | null }>(`/vendor/customer-avatar/${customerId}`, { method: "GET" })
      .then(({ avatar_url }) => { if (avatar_url) setAvatarUrl(avatar_url) })
      .catch(() => {})
  }, [customerId])

  const displayName = info
    ? [info.first_name, info.last_name].filter(Boolean).join(" ") || info.email || customerId || "Customer"
    : null

  return { displayName, avatarUrl }
}

// ── ContextAvatar — left-side visual icon for the conversation ───────────────
// PRODUCT_BASED: product thumbnail (rounded-xl, object-cover)
// VENDOR_BASED:  customer avatar (rounded-full, object-cover)
// ADMIN_SUPPORT: site logo
function ContextThumbnail({
  conv,
  customerAvatarUrl,
  customerName,
  isProduct,
  isAdmin,
}: {
  conv: Conversation
  customerAvatarUrl: string | null
  customerName: string
  isProduct: boolean
  isAdmin: boolean
}) {
  const meta = conv.metadata as ConversationMetadata | null

  if (isAdmin) {
    return (
      <img
        src="/logo.png"
        alt="Yardım Destek"
        className="w-10 h-10 rounded-full object-cover aspect-square flex-shrink-0"
      />
    )
  }

  // PRODUCT_BASED: show product thumbnail from metadata (or fallback icon)
  if (isProduct) {
    const productImage = meta?.type === "product" ? meta.product_image : null
    if (productImage) {
      return (
        <img
          src={productImage}
          alt={meta?.type === "product" ? meta.product_name : "Ürün"}
          className="w-10 h-10 rounded-xl object-cover aspect-square flex-shrink-0"
        />
      )
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-ui-tag-orange-bg flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-ui-tag-orange-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    )
  }

  // VENDOR_BASED: show customer avatar (this is the vendor seeing their customers)
  return (
    <img
      src={customerAvatarUrl ?? "/images/customer-default-avatar.jpg"}
      alt={customerName}
      className="w-10 h-10 rounded-full object-cover aspect-square flex-shrink-0"
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ThreadListItemProps {
  conv: Conversation
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}

/**
 * Vendor Panel — single conversation row in the thread list.
 * - PRODUCT_BASED: product thumbnail (from metadata) + product name + "Ürün sorusu" badge
 * - VENDOR_BASED:  customer avatar + customer name + "MAĞAZA SORUSU" badge
 * - ADMIN_SUPPORT: site logo
 */
export function ThreadListItem({
  conv,
  isActive,
  onOpen,
  onDelete,
}: ThreadListItemProps) {
  const isProduct =
    conv.contextType === "PRODUCT_BASED" ||
    (conv.contextType !== "VENDOR_BASED" && !!conv.productId)
  const other = conv.participants?.find((p) => p.userType !== "SELLER") ?? null
  const isAdmin = other?.userType === "ADMIN"
  const isOtherCustomer =
    !isAdmin &&
    (other?.userType === "CUSTOMER" || !!other?.userId?.startsWith("cus_"))
  const { t, i18n } = useTranslation()
  const locale = languages.find((l) => l.code === i18n.language)?.date_locale

  const { displayName: resolvedDisplayName, avatarUrl: resolvedAvatarUrl } =
    useCustomerInfo(isOtherCustomer ? other?.userId : undefined)

  // For PRODUCT_BASED, show product name from metadata (fallback: customer name)
  const meta = conv.metadata as ConversationMetadata | null
  const productName = meta?.type === "product" ? meta.product_name : null

  const name = isProduct
    ? (productName ?? resolvedDisplayName ?? other?.displayName ?? "Ürün sorusu")
    : (resolvedDisplayName ?? other?.displayName ?? "Customer")

  const lastMsg = conv.messages?.[0]
  const unread =
    conv.participants?.find((p) => p.userType === "SELLER")?.unreadCount ?? 0

  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null
  )
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div className="relative group">
        <div
          onClick={() => onOpen(conv.id)}
          className={`w-full text-left p-3 border-b border-ui-border-base transition-colors hover:bg-ui-bg-base-hover cursor-pointer ${
            isActive
              ? "bg-ui-bg-base border-l-2 border-l-ui-border-interactive"
              : ""
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Left visual */}
            <div className="relative flex-shrink-0">
              <ContextThumbnail
                conv={conv}
                customerAvatarUrl={resolvedAvatarUrl}
                customerName={name}
                isProduct={isProduct}
                isAdmin={isAdmin}
              />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ui-tag-blue-bg text-ui-tag-blue-text text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center justify-between">
                {isAdmin ? (
                  <img
                    src="/brand-logo.png"
                    alt="Kayı.com"
                    className="h-4 object-contain"
                  />
                ) : (
                  <span className="text-sm font-medium text-ui-fg-base truncate">
                    {name}
                  </span>
                )}
                <span className="text-xs text-ui-fg-muted flex-shrink-0 ml-1">
                  {formatDistanceToNow(new Date(conv.updatedAt), {
                    addSuffix: true,
                    locale,
                  })}
                </span>
              </div>
              <p className="text-xs text-ui-fg-muted truncate mt-0.5">
                {lastMsg
                  ? lastMsg.messageType === "IMAGE"
                    ? `📷 ${t("messenger.imageMessage")}`
                    : lastMsg.content?.slice(0, 50)
                  : conv.subject ?? t("messages.noMessages")}
              </p>

              {/* Context badge */}
              {isAdmin ? null : isProduct ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
                  <svg
                    className="w-2.5 h-2.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {t("messages.productQuestion")}
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
                  <svg
                    className="w-2.5 h-2.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  MAĞAZA SORUSU
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
                const rect = (
                  e.currentTarget as HTMLButtonElement
                ).getBoundingClientRect()
                setMenuPos({
                  top: rect.bottom + 4,
                  right: window.innerWidth - rect.right,
                })
              }
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover transition-all"
            aria-label="Sohbet seçenekleri"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setMenuPos(null)}
          />
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
            }}
            className="w-52 bg-ui-bg-overlay rounded-xl shadow-lg border border-ui-border-base overflow-hidden text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMenuPos(null)
                onDelete(conv.id, false)
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors"
            >
              {t("messages.deleteOnlyForMe")}
            </button>
            <button
              onClick={() => {
                setMenuPos(null)
                onDelete(conv.id, true)
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-tag-red-bg text-ui-tag-red-text transition-colors"
            >
              {t("messages.deleteForEveryone")}
            </button>
            <button
              onClick={() => setMenuPos(null)}
              className="w-full text-left px-4 py-2.5 text-ui-fg-muted hover:text-ui-fg-base transition-colors text-sm"
            >
              {t("messages.close")}
            </button>
          </div>
        </>
      )}
    </>
  )
}

