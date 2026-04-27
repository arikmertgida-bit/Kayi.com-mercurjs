import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { Heading } from "@medusajs/ui"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
import { MEDUSA_STOREFRONT_URL } from "../../../lib/storefront"
import type { Message } from "../../../lib/messenger/types"

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// â”€â”€ Customer info lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  return { info, displayName, avatarUrl }
}

// â”€â”€ Participant resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getOtherParticipant(participants: any[]) {
  // SELLER type = current vendor; other = CUSTOMER or ADMIN
  return participants.find((p) => p.userType !== "SELLER") ?? null
}

// â”€â”€ ConvRow component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ConvRow({
  conv,
  isActive,
  onOpen,
  onDelete,
}: {
  conv: any
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}) {
  const other = getOtherParticipant(conv.participants ?? [])
  const isAdmin = other?.userType === "ADMIN"
  const isCustomer = other?.userType === "CUSTOMER" || other?.userId?.startsWith("cus_")

  const { t } = useTranslation()

  // Customer name lookup
  const { displayName: customerDisplayName, avatarUrl: customerAvatarUrl } = useCustomerInfo(
    isCustomer ? other?.userId : undefined
  )

  const name = isAdmin
    ? t("messenger.supportTeam")
    : isCustomer
    ? customerDisplayName ?? other?.displayName ?? other?.userId ?? "Customer"
    : other?.displayName ?? other?.userId ?? t("messenger.unknown")

  const initials = (name || "?")[0]?.toUpperCase() ?? "?"
  const lastMsg = conv.messages?.[0]
  // Unread count for the SELLER participant (me)
  const unread = conv.participants?.find((p: any) => p.userType === "SELLER")?.unreadCount ?? 0

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
          isActive ? "bg-ui-bg-base" : ""
        }`}
      >
      <div className="flex items-start gap-2">
        <div className="relative flex-shrink-0">
          {isCustomer ? (
            <img
              src={customerAvatarUrl ?? "/images/customer-default-avatar.jpg"}
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
                  ? t("messenger.imageMessage")
                  : lastMsg.content?.slice(0, 50)
                : conv.subject ?? t("messenger.noMessages")}
            </p>
            {conv.productId ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                Ürün sorusu
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                Mağaza
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 3-dot menu */}
      <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover transition-all opacity-0 group-hover:opacity-100"
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

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MessengerVendorInboxProps {
  sellerId: string
  sellerName?: string
}

export function MessengerVendorInbox({ sellerId }: MessengerVendorInboxProps) {
  const {
    conversations,
    activeConversationId,
    messages,
    typingUserIds,
    isLoadingMessages,
    isConnected,
    openConversation,
    closeConversation,
    sendMessage,
    uploadImage,
    deleteMessage,
    deleteConversation,
    startTyping,
    stopTyping,
  } = useMessenger()

  const { t } = useTranslation()

  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConv ? getOtherParticipant(activeConv.participants ?? []) : null
  const isOtherAdmin = otherParticipant?.userType === "ADMIN"
  const isOtherCustomer =
    otherParticipant?.userType === "CUSTOMER" || otherParticipant?.userId?.startsWith("cus_")

  const { displayName: customerDisplayName, avatarUrl: customerAvatarUrl } = useCustomerInfo(
    isOtherCustomer ? otherParticipant?.userId : undefined
  )

  // Product context: fetch product info if conversation has a productId
  const [productInfo, setProductInfo] = useState<{ title: string; thumbnail: string | null; handle: string | null } | null>(null)
  useEffect(() => {
    const pid = activeConv?.productId
    if (!pid) { setProductInfo(null); return }
    fetchQuery<{ product: { title: string; thumbnail: string | null; handle: string | null } }>(`/vendor/products/${pid}`, { method: "GET" })
      .then(({ product }) => setProductInfo({ title: product.title, thumbnail: product.thumbnail, handle: product.handle ?? null }))
      .catch(() => setProductInfo(null))
  }, [activeConv?.productId])

  const otherName = isOtherAdmin
    ? t("messenger.supportTeam")
    : isOtherCustomer
    ? customerDisplayName ?? otherParticipant?.displayName ?? "Customer"
    : otherParticipant?.displayName ?? t("messenger.unknown")

  const isOtherTyping = typingUserIds.length > 0

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || isSending || !activeConversationId) return
    setIsSending(true)
    setText("")
    stopTyping()
    try {
      await sendMessage(content)
    } catch (err) {
      console.error("[MessengerVendorInbox] send error:", err)
    } finally {
      setIsSending(false)
    }
  }, [text, isSending, activeConversationId, sendMessage, stopTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    requestAnimationFrame(() => {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`
    })
    if (!isTypingRef.current) {
      isTypingRef.current = true
      startTyping()
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      stopTyping()
    }, 2000)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    try {
      await uploadImage(file)
    } catch (err) {
      console.error("[MessengerVendorInbox] image upload error:", err)
    } finally {
      e.target.value = ""
    }
  }

  const handleDeleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    setDeleteTarget(null)
    try {
      await deleteMessage(messageId, deleteForAll)
    } catch (err) {
      console.error("[MessengerVendorInbox] delete error:", err)
    }
  }, [deleteMessage])

  // â”€â”€ Search (min 2 chars) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Only show DIRECT conversations — ADMIN_SUPPORT traffic lives in the Support drawer
  const directConversations = conversations.filter((c) => c.type === "DIRECT")
  const handleOpenConversation = useCallback((id: string) => {
    openConversation(id)
    setMobileView('chat')
  }, [openConversation])

  const filtered =
    search.length < 2
      ? directConversations
      : directConversations.filter((c) => {
          const q = search.toLowerCase()
          return (
            c.subject?.toLowerCase().includes(q) ||
            c.participants?.some(
              (p: any) =>
                p.displayName?.toLowerCase().includes(q) ||
                p.userId?.toLowerCase().includes(q)
            )
          )
        })

  return (
    <div className="flex h-[700px] border border-ui-border-base rounded-lg overflow-hidden">
      {/* â”€â”€ Left: Conversation list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-ui-border-base bg-ui-bg-subtle flex-shrink-0`}>
        <div className="p-3 border-b border-ui-border-base">
          <div className="flex items-center justify-between mb-2">
            <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">
              Messages
            </Heading>
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-ui-fg-muted"}`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-ui-fg-muted text-sm mt-8">No conversations</p>
          ) : (
            filtered.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onOpen={handleOpenConversation}
                onDelete={deleteConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* â”€â”€ Right: Chat panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeConv ? (
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
          {/* Chat Header */}
          <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
              aria-label="Geri"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {isOtherCustomer ? (
              <img
                src={customerAvatarUrl ?? "/images/customer-default-avatar.jpg"}
                alt={otherName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  isOtherAdmin
                    ? "bg-ui-tag-purple-bg text-ui-tag-purple-text"
                    : "bg-ui-tag-blue-bg text-ui-tag-blue-text"
                }`}
              >
                {(otherName[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ui-fg-base truncate">{otherName}</p>
              <p className="text-xs text-ui-fg-muted">
                {otherParticipant?.userType}
                {" · "}
                {activeConv.participants?.length} {t("messenger.participants")}
              </p>
            </div>
            <button
              onClick={() => { closeConversation(); setMobileView('list') }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
              aria-label={t("messenger.close")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product context banner */}
          {productInfo && (
            <div className="flex items-center gap-3 px-3 py-2 bg-ui-bg-base border-b border-ui-border-base">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-ui-bg-subtle flex-shrink-0">
                {productInfo.thumbnail ? (
                  <img src={productInfo.thumbnail} alt={productInfo.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ui-fg-muted">Ürün hakkında soru</p>
                {productInfo.handle ? (
                  <a
                    href={`${MEDUSA_STOREFRONT_URL}/tr/products/${productInfo.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-ui-fg-base hover:text-ui-fg-interactive hover:underline truncate block transition-colors"
                  >
                    {productInfo.title} ↗
                  </a>
                ) : (
                  <p className="text-sm font-medium text-ui-fg-base truncate">{productInfo.title}</p>
                )}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-ui-tag-blue-bg text-ui-tag-blue-text font-medium">Ürün</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    isOtherAdmin
                      ? "bg-ui-tag-purple-bg text-ui-tag-purple-text"
                      : "bg-ui-tag-blue-bg text-ui-tag-blue-text"
                  }`}
                >
                  <span className="text-base font-bold">{(otherName[0] ?? "?").toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-ui-fg-base">{otherName}</p>
                <p className="text-xs text-ui-fg-muted mt-1">{t("messenger.startConversation")}</p>
              </div>
            ) : (
              messages.map((msg: Message, idx: number) => {
                // SELLER = me (vendor), others = customer or admin
                const isMe = msg.senderType === "SELLER"
                const isNotification = msg.messageType === "NOTIFICATION"

                if (isNotification) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                // Check if last my message for read receipt
                const myMsgs = messages.filter((m) => m.senderType === "SELLER")
                const isLastMine = isMe && msg.id === myMsgs[myMsgs.length - 1]?.id

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group relative max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                          : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                      }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                    >
                      {!isMe && (
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.senderType}</p>
                      )}
                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <img src={msg.imageUrl} alt={t("messenger.image")} className="max-w-full rounded-lg mb-1" />
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 opacity-60 text-right ${
                          isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isMe && isLastMine && msg.readAt && (
                          <span className="ml-1">{" · "}{t("messenger.seen")}</span>
                        )}
                      </p>

                      {/* Trash icon */}
                      {!msg.deletedForAll && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(deleteTarget === msg.id ? null : msg.id) }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-full bg-white/80 shadow text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {deleteTarget === msg.id && (
                            <div
                              className={`absolute z-50 top-8 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-0.5 min-w-[160px] ${isMe ? "right-0" : "left-0"}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button onClick={() => handleDeleteMessage(msg.id, false)} className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700">
                                Benden Sil
                              </button>
                              <button
                                disabled={msg.senderId !== sellerId}
                                onClick={() => handleDeleteMessage(msg.id, true)}
                                className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Herkes İçin Sil
                              </button>
                              <button onClick={() => setDeleteTarget(null)} className="text-left text-xs px-3 py-1 text-gray-400 hover:text-gray-600">
                                İptal
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full text-ui-fg-muted hover:text-ui-fg-subtle hover:bg-ui-bg-base-hover transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-3 py-2 text-sm rounded-2xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:border-ui-border-interactive resize-none leading-5 max-h-24 overflow-y-auto"
              style={{ minHeight: "36px" }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || isSending}
              className="w-9 h-9 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col items-center justify-center text-center px-8`}>
          <div className="w-12 h-12 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-ui-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ui-fg-base mb-1">Select a conversation</p>
          <p className="text-xs text-ui-fg-muted">Start messaging your customers or support team</p>
        </div>
      )}
    </div>
  )
}
