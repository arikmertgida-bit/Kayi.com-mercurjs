import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Heading } from "@medusajs/ui"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
import type { Message, MessageContext, ProductContextData } from "../../../lib/messenger/types"
import { ThreadListItem } from "./ThreadListItem"
import { ProductContextCard } from "./ProductContextCard"
import { VendorContextCard } from "./VendorContextCard"
import { ChatHeader } from "./ChatHeader"

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
  const [sendError, setSendError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
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

  // Active conversation context (PRODUCT or VENDOR) — drives ChatHeader + context cards
  const [activeContext, setActiveContext] = useState<MessageContext | null>(null)
  useEffect(() => {
    const conv = activeConv
    if (!conv) { setActiveContext(null); return }

    const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

    if (isProduct && conv.productId) {
      const pid = conv.productId
      fetchQuery<{ product: ProductContextData & { thumbnail: string | null; handle: string | null } }>(
        `/vendor/products/${pid}`,
        { method: "GET" }
      )
        .then(({ product }) => {
          setActiveContext({
            type: "PRODUCT",
            data: {
              id: pid,
              title: product.title,
              thumbnail: product.thumbnail ?? null,
              handle: product.handle ?? null,
            },
          })
        })
        .catch(() => setActiveContext(null))
    } else {
      setActiveContext({ type: "VENDOR", data: { id: "", name: "", handle: "", photo: null } })
    }
  }, [activeConv?.id])

  const otherName = isOtherAdmin
    ? t("messenger.supportTeam")
    : isOtherCustomer
    ? customerDisplayName ?? otherParticipant?.displayName ?? "Customer"
    : otherParticipant?.displayName ?? t("messenger.unknown")

  const isOtherTyping = typingUserIds.length > 0

  // Auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    if (!activeConversationId) return

    // Pending image takes priority
    if (pendingImage) {
      setIsSending(true)
      setSendError(null)
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        console.error("[MessengerVendorInbox] image upload error:", err)
        setSendError("Görsel gönderilemedi. Lütfen tekrar deneyin.")
      } finally {
        setIsSending(false)
      }
      return
    }

    const content = text.trim()
    if (!content || isSending) return
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
  }, [text, pendingImage, pendingImagePreview, isSending, activeConversationId, sendMessage, stopTyping, uploadImage])

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
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
    <>
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
              <ThreadListItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onOpen={handleOpenConversation}
                onDelete={deleteConversation}
                customerDisplayName={null}
                customerAvatarUrl={null}
              />
            ))
          )}
        </div>
      </div>

      {/* â”€â”€ Right: Chat panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeConv ? (
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
          {/* Chat Header — context-aware */}
          <ChatHeader
            context={activeContext}
            otherName={otherName}
            otherParticipantType={otherParticipant?.userType ?? ""}
            participantCount={activeConv.participants?.length ?? 0}
            onBack={() => setMobileView('list')}
            onClose={() => { closeConversation(); setMobileView('list') }}
          />

          {/* Context card — product or vendor */}
          {activeContext?.type === "PRODUCT" && (
            <ProductContextCard product={activeContext.data} />
          )}
          {activeContext?.type === "VENDOR" && (
            <VendorContextCard />
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
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

                // Message grouping
                const prevMsg = messages[idx - 1]
                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.messageType === "NOTIFICATION"

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
                      {!isMe && isFirstInGroup && (
                        <p className="text-xs font-medium mb-1 opacity-70">{otherName}</p>
                      )}
                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <button
                          onClick={() => setLightboxSrc(msg.imageUrl!)}
                          className="block border-0 p-0 cursor-zoom-in rounded-lg overflow-hidden"
                        >
                          <img src={msg.imageUrl} alt={t("messenger.image")} className="max-w-full rounded-lg mb-1 hover:opacity-90 transition-opacity" />
                        </button>
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
                            className={`absolute top-1 right-1 transition-opacity w-5 h-5 flex items-center justify-center rounded-full bg-white/80 shadow text-gray-400 hover:text-red-500 ${deleteTarget === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
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
                                disabled={!isMe}
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
          <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex flex-col gap-2">
            {!isConnected && (
              <div className="px-3 py-1.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                Bağlantı kesildi, yeniden bağlanılıyor…
              </div>
            )}
            {sendError && (
              <p className="text-xs text-red-500 px-1">{sendError}</p>
            )}
            <div className="flex gap-2 items-end">
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
            {pendingImagePreview && (
              <div className="relative flex-shrink-0">
                <img
                  src={pendingImagePreview}
                  alt="Gönderilecek görsel"
                  className="w-10 h-10 rounded-lg object-cover border border-ui-border-base"
                />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pendingImagePreview)
                    setPendingImagePreview(null)
                    setPendingImage(null)
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
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
              disabled={(!text.trim() && !pendingImage) || isSending}
              className="w-9 h-9 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
            </div>
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

    {/* Lightbox */}
    {lightboxSrc && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={() => setLightboxSrc(null)}
      >
        <button
          className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={() => setLightboxSrc(null)}
          aria-label="Kapat"
        >
          ✕
        </button>
        <img
          src={lightboxSrc}
          alt="Görsel"
          className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}
