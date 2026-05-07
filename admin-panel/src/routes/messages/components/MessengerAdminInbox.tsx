import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Heading } from "@medusajs/ui"
import { useMessengerAdmin } from "../../../providers/messenger-provider/MessengerAdminProvider"
import type { Message, MessageContext, ProductContextData } from "../../../lib/messenger/types"
import { sdk } from "../../../lib/client"
import { ProductContextCard } from "./ProductContextCard"
import { VendorContextCard } from "./VendorContextCard"

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Bugün"
  if (d.toDateString() === yesterday.toDateString()) return "Dün"
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
}

function getOtherParticipant(participants: any[]) {
  return participants.find((p) => p.userType !== "ADMIN") ?? null
}

interface MessengerAdminInboxProps {
  adminId: string
}

export function MessengerAdminInbox({ adminId }: MessengerAdminInboxProps) {
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
  } = useMessengerAdmin()

  const { t } = useTranslation()

  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMenuPos, setDeleteMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const [convMenuTarget, setConvMenuTarget] = useState<string | null>(null)
  const [convMenuPos, setConvMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  // Active conversation context (PRODUCT or VENDOR) — drives context cards
  const [activeContext, setActiveContext] = useState<MessageContext | null>(null)
  useEffect(() => {
    const conv = activeConv
    if (!conv) { setActiveContext(null); return }

    const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

    if (isProduct && conv.productId) {
      const pid = conv.productId
      sdk.admin.product.retrieve(pid, { fields: "id,title,thumbnail,handle" })
        .then(({ product }) => {
          setActiveContext({
            type: "PRODUCT",
            data: {
              id: pid,
              title: product.title,
              thumbnail: (product as any).thumbnail ?? null,
              handle: (product as any).handle ?? null,
            } as ProductContextData,
          })
        })
        .catch(() => setActiveContext(null))
    } else if (conv.contextType === "VENDOR_BASED") {
      setActiveContext({ type: "VENDOR", data: {} as Record<string, never> })
    } else {
      setActiveContext(null)
    }
  }, [activeConv?.id])

  const getParticipantName = (p: any) => {
    if (!p) return t("messenger.unknown")
    if (p.displayName) return p.displayName
    if (p.userType === "CUSTOMER") return p.userId ?? "Customer"
    if (p.userType === "SELLER") return p.userId ?? "Seller"
    return p.userId ?? t("messenger.unknown")
  }

  const isOtherTyping = typingUserIds.length > 0

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    if (!activeConversationId) return

    if (pendingImage) {
      setIsSending(true)
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        console.error("[MessengerAdminInbox] image upload error:", err)
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
      console.error("[MessengerAdminInbox] send error:", err)
    } finally {
      setIsSending(false)
    }
  }, [text, pendingImage, pendingImagePreview, isSending, activeConversationId, sendMessage, stopTyping, uploadImage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

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

  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForAll: boolean) => {
      setDeleteTarget(null)
      setDeleteMenuPos(null)
      try {
        await deleteMessage(messageId, deleteForAll)
      } catch (err) {
        console.error("[MessengerAdminInbox] delete error:", err)
      }
    },
    [deleteMessage]
  )

  const handleOpenConversation = useCallback(
    (id: string) => {
      openConversation(id)
      setMobileView("chat")
    },
    [openConversation]
  )

  const filtered =
    search.length < 2
      ? conversations
      : conversations.filter((c) => {
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

  const getConvLabel = (conv: any) => {
    const other = getOtherParticipant(conv.participants ?? [])
    return getParticipantName(other)
  }

  const getUnreadForConv = (conv: any) => {
    const self = conv.participants?.find((p: any) => p.userType === "ADMIN")
    return self?.unreadCount ?? 0
  }

  return (
    <>
      <div className="flex h-[700px] border border-ui-border-base rounded-lg overflow-hidden">
        {/* ── Conversation list ── */}
        <div
          className={`${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          } w-full md:w-80 flex-col border-r border-ui-border-base bg-ui-bg-subtle flex-shrink-0`}
        >
          <div className="p-3 border-b border-ui-border-base">
            <div className="flex items-center justify-between mb-2">
              <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">
                {t("messages.domain")}
              </Heading>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-ui-fg-muted"}`}
                title={isConnected ? "Connected" : "Disconnected"}
              />
            </div>
            <input
              type="text"
              placeholder={t("messenger.searchConversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-ui-fg-muted text-sm mt-8">
                {t("messenger.noConversations")}
              </p>
            ) : (
              filtered.map((conv) => {
                const unread = getUnreadForConv(conv)
                const isActive = conv.id === activeConversationId
                const label = getConvLabel(conv)
                const lastMsg = conv.messages?.[0]
                return (
                  <div key={conv.id} className="relative group">
                    <div
                      onClick={() => handleOpenConversation(conv.id)}
                      className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-ui-border-base transition-colors ${
                        isActive ? "bg-ui-bg-base-pressed" : "hover:bg-ui-bg-base"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <img src="/logo.png" alt="Destek" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-ui-fg-base truncate">{label}</span>
                          {lastMsg && (
                            <span className="text-xs text-ui-fg-muted flex-shrink-0 ml-1">
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="text-xs text-ui-fg-muted truncate">
                            {lastMsg?.content ?? (conv.type === "ADMIN_SUPPORT" ? t("messenger.support") : t("messenger.direct"))}
                          </span>
                          {unread > 0 && (
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text text-[10px] font-bold flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 3-dot conversation menu */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (convMenuTarget === conv.id) {
                            setConvMenuTarget(null)
                            setConvMenuPos(null)
                          } else {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            setConvMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                            setConvMenuTarget(conv.id)
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover transition-all"
                        aria-label="Sohbet seçenekleri"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Chat panel ── */}
        {activeConv ? (
          <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ui-border-base bg-ui-bg-base">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="Destek" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ui-fg-base truncate">Destek Ekibi</p>
                <p className="text-xs text-ui-fg-muted">
                  Yönetim Mesajı
                </p>
              </div>
              <button
                onClick={() => { closeConversation(); setMobileView("list") }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted"
                title={t("messages.close")}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Context card */}
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
                  <img src="/logo.png" alt="Destek" className="w-10 h-10 rounded-full object-cover mb-3" />
                  <p className="text-sm font-medium text-ui-fg-base">Destek Ekibi</p>
                  <p className="text-xs text-ui-fg-muted mt-1">{t("messenger.startConversation")}</p>
                </div>
              ) : (
                (() => {
                  const items: React.ReactNode[] = []
                  let lastDate = ""
                  messages.forEach((msg: Message, idx: number) => {
                    const msgDate = formatDate(msg.createdAt)
                    if (msgDate !== lastDate) {
                      lastDate = msgDate
                      items.push(
                        <div key={`date-${msg.id}`} className="flex justify-center">
                          <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">{msgDate}</span>
                        </div>
                      )
                    }
                    const isMe = msg.senderType === "ADMIN"
                    const isNotification = msg.messageType === "NOTIFICATION"
                    const prevMsg = messages[idx - 1]
                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.messageType === "NOTIFICATION"
                    if (isNotification) {
                      items.push(
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">{msg.content}</span>
                        </div>
                      )
                      return
                    }
                    const myMsgs = messages.filter((m) => m.senderType === "ADMIN")
                    const isLastMine = isMe && msg.id === myMsgs[myMsgs.length - 1]?.id
                    items.push(
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`group relative max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                            isMe
                              ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                              : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                          }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                        >
                          {!isMe && isFirstInGroup && (
                            <p className="text-xs font-medium mb-1 opacity-70">Yardım Destek</p>
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
                          <p className={`text-xs mt-1 opacity-60 text-right ${isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"}`}>
                            {formatTime(msg.createdAt)}
                            {isMe && isLastMine && msg.readAt && (
                              <span className="ml-1">{" · "}{t("messenger.seen")}</span>
                            )}
                          </p>
                          {!msg.deletedForAll && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (deleteTarget === msg.id) {
                                  setDeleteTarget(null)
                                  setDeleteMenuPos(null)
                                } else {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                  setDeleteMenuPos(
                                    isMe
                                      ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                                      : { top: rect.bottom + 4, left: rect.left }
                                  )
                                  setDeleteTarget(msg.id)
                                }
                              }}
                              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-ui-bg-base/80 shadow text-ui-fg-muted hover:text-ui-fg-base transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                  return items
                })()
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
              <div />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex flex-col gap-2">
              {!isConnected && (
                <div className="px-3 py-1.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                  {t("messages.connectionLost")}
                </div>
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
                  placeholder={t("messenger.typeMessage")}
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
          <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} flex-1 flex-col items-center justify-center text-center px-8`}>
            <div className="w-12 h-12 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-ui-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ui-fg-base mb-1">{t("messenger.selectConversation")}</p>
            <p className="text-xs text-ui-fg-muted">{t("messenger.startMessaging")}</p>
          </div>
        )}
      </div>

      {/* Delete menu */}
      {deleteTarget && deleteMenuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }} />
          <div
            style={{
              position: "fixed",
              top: deleteMenuPos.top,
              ...(deleteMenuPos.right !== undefined ? { right: deleteMenuPos.right } : { left: deleteMenuPos.left }),
              zIndex: 9999,
            }}
            className="bg-ui-bg-overlay rounded-xl shadow-elevation-modal border border-ui-border-base p-1.5 flex flex-col gap-0.5 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => handleDeleteMessage(deleteTarget, false)} className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors">
              {t("messages.delete")}
            </button>
            <button
              disabled={messages.find((m) => m.id === deleteTarget)?.senderId !== adminId}
              onClick={() => handleDeleteMessage(deleteTarget, true)}
              className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-ui-tag-red-bg text-ui-tag-red-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("messages.deleteForEveryone")}
            </button>
            <button onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }} className="text-left text-xs px-3 py-1 text-ui-fg-muted hover:text-ui-fg-base transition-colors">
              {t("messages.close")}
            </button>
          </div>
        </>
      )}

      {/* Conversation delete menu */}
      {convMenuTarget && convMenuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setConvMenuTarget(null); setConvMenuPos(null) }} />
          <div
            style={{ position: "fixed", top: convMenuPos.top, right: convMenuPos.right, zIndex: 9999 }}
            className="w-52 bg-ui-bg-overlay rounded-xl shadow-lg border border-ui-border-base overflow-hidden text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { const id = convMenuTarget; setConvMenuTarget(null); setConvMenuPos(null); deleteConversation(id, false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors"
            >
              {t("messages.delete")}
            </button>
            <button
              onClick={() => { const id = convMenuTarget; setConvMenuTarget(null); setConvMenuPos(null); deleteConversation(id, true) }}
              className="w-full text-left px-4 py-2.5 hover:bg-ui-tag-red-bg text-ui-tag-red-text transition-colors"
            >
              {t("messages.deleteForEveryone")}
            </button>
            <button
              onClick={() => { setConvMenuTarget(null); setConvMenuPos(null) }}
              className="w-full text-left px-4 py-2.5 text-ui-fg-muted hover:text-ui-fg-base transition-colors text-sm"
            >
              {t("messages.close")}
            </button>
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" onClick={() => setLightboxSrc(null)} aria-label={t("messages.close")}>
            ✕
          </button>
          <img src={lightboxSrc} alt={t("messenger.image")} className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
