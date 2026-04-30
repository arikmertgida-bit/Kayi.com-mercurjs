"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useMessenger } from "@/providers/MessengerProvider"
import { MSG } from "@/lib/messenger/strings"
import { useSellerAvatar } from "@/hooks/useSellerAvatar"
import type { Conversation, Message, MessageContext, VendorContextData, ProductContextData } from "@/lib/messenger/types"
import { ThreadListItem } from "./components/ThreadListItem"
import { ProductContextCard } from "./components/ProductContextCard"
import { VendorContextCard } from "./components/VendorContextCard"
import { ChatHeader } from "./components/ChatHeader"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return MSG.TIME_JUST_NOW
  if (minutes < 60) return `${minutes}${MSG.TIME_MINUTES}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}${MSG.TIME_HOURS}`
  const days = Math.floor(hours / 24)
  return `${days}${MSG.TIME_DAYS}`
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 40,
  gradient = "from-amber-400 to-orange-400",
}: {
  src?: string | null
  name?: string | null
  size?: number
  gradient?: string
}) {
  const safeName = name ?? ""
  const initials =
    safeName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  if (src) {
    return (
      <Image
        src={src}
        alt={safeName || "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.33 }}
    >
      {initials}
    </div>
  )
}

// ── TypingDots ────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface MessengerInboxProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatarUrl?: string | null
}

export function MessengerInbox({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: MessengerInboxProps) {
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

  const [searchQuery, setSearchQuery] = useState("")
  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMenuPos, setDeleteMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
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
  const isAdminSupportConv = activeConv?.type === "ADMIN_SUPPORT"
  const otherParticipant = activeConv?.participants.find(
    (p) => p.userId !== currentUserId
  )
  const isSeller = otherParticipant?.userType === "SELLER"
  const { avatarUrl: sellerAvatarUrl, displayName: sellerDisplayName } = useSellerAvatar(
    isSeller ? otherParticipant?.userId : undefined
  )
  const otherName =
    sellerDisplayName ??
    otherParticipant?.displayName ??
    MSG.UNKNOWN_USER
  const otherAvatarUrl = isSeller
    ? (sellerAvatarUrl ?? null)
    : "/images/customer-default-avatar.jpg"
  const isOtherTyping = typingUserIds.length > 0

  const params = useParams()
  const locale = (params?.locale as string) ?? "tr"

  // Active conversation context (PRODUCT or VENDOR) — drives ChatHeader + context cards
  const [activeContext, setActiveContext] = useState<MessageContext | null>(null)

  useEffect(() => {
    const conv = activeConv
    if (!conv) { setActiveContext(null); return }

    const isProduct = conv.contextType === "PRODUCT_BASED" || (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

    if (isProduct && conv.productId) {
      const pid = conv.productId
      fetch(`/api/product/${encodeURIComponent(pid)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.product) {
            setActiveContext({
              type: "PRODUCT",
              data: {
                id: pid,
                title: data.product.title,
                thumbnail: data.product.thumbnail ?? null,
                handle: data.product.handle ?? null,
              },
            })
          } else {
            setActiveContext(null)
          }
        })
        .catch(() => setActiveContext(null))
    } else if (!isProduct) {
      const sellerParticipant = conv.participants.find((p) => p.userType === "SELLER")
      const memberId = sellerParticipant?.userId
      if (!memberId) { setActiveContext(null); return }

      fetch(`/api/vendor-info/${encodeURIComponent(memberId)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.name) {
            setActiveContext({
              type: "VENDOR",
              data: {
                id: data.id ?? memberId,
                name: data.name,
                handle: data.handle ?? "",
                photo: data.photo ?? null,
                storePhoto: data.storePhoto ?? null,
              },
            })
          } else {
            setActiveContext(null)
          }
        })
        .catch(() => setActiveContext(null))
    } else {
      setActiveContext(null)
    }
  }, [activeConv?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, typingUserIds])

  // Reset send error when switching conversations
  useEffect(() => {
    setSendError(null)
    setText("")
  }, [activeConversationId])

  const handleSend = useCallback(async () => {
    if (!pendingImage && !text.trim()) return
    if (isSending) return

    setIsSending(true)
    setSendError(null)
    const content = text.trim()

    // Upload pending image first
    if (pendingImage) {
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        console.error("[MessengerInbox] image upload error:", err)
        setSendError("Görsel gönderilemedi. Lütfen tekrar deneyin.")
        setIsSending(false)
        return
      }
    }

    // Then send text if any
    if (content) {
      setText("")
      stopTyping()
      try {
        await sendMessage(content)
      } catch (err) {
        console.error("[MessengerInbox] send error:", err)
        setText(content)
        setSendError("Mesaj gönderilemedi. Tekrar deneyin.")
      }
    }

    setIsSending(false)
  }, [text, pendingImage, pendingImagePreview, isSending, sendMessage, stopTyping, uploadImage])

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
    if (!file) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const handleDeleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    setDeleteTarget(null)
    setDeleteMenuPos(null)
    try {
      await deleteMessage(messageId, deleteForAll)
    } catch (err) {
      console.error("[MessengerInbox] delete error:", err)
    }
  }, [deleteMessage])

  const handleOpenConversation = useCallback((id: string) => {
    openConversation(id)
    setMobileView('chat')
  }, [openConversation])

  const filtered =
    searchQuery.length < 2
      ? conversations
      : conversations.filter((c) => {
          const q = searchQuery.toLowerCase()
          const other = c.participants.find((p) => p.userId !== currentUserId)
          return (
            c.subject?.toLowerCase().includes(q) ||
            other?.displayName?.toLowerCase().includes(q) ||
            other?.userId?.toLowerCase().includes(q)
          )
        })

  return (
    <>
    <div className="flex h-[700px] border border-gray-300 rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* ── Left: Conversation List ──────────────────────────────────────────── */}
      <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Image src="/icon.png" alt="Site simgesi" width={24} height={24} className="object-contain flex-shrink-0" />
          <h2 className="text-lg font-bold text-gray-900">{MSG.MESSAGES_TITLE}</h2>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={MSG.SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                {searchQuery ? MSG.NO_SEARCH_RESULTS : MSG.NO_MESSAGES_EMPTY}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ThreadListItem
                key={conv.id}
                conv={conv}
                currentUserId={currentUserId}
                isActive={conv.id === activeConversationId}
                onOpen={handleOpenConversation}
                onDelete={deleteConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat Panel ────────────────────────────────────────────────── */}
      {activeConv && otherParticipant ? (
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
          {/* Chat Header — context-aware (product title or store name) */}
          <ChatHeader
            context={activeContext}
            locale={locale}
            onBack={() => setMobileView('list')}
            onClose={() => { closeConversation(); setMobileView('list') }}
            fallbackName={otherName}
            isAdminSupport={isAdminSupportConv}
          />

          {/* Context card — sticky under header */}
          {activeContext?.type === "PRODUCT" && (
            <ProductContextCard product={activeContext.data} locale={locale} />
          )}
          {activeContext?.type === "VENDOR" && (
            <VendorContextCard vendor={activeContext.data} locale={locale} />
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/40">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Avatar src={otherAvatarUrl} name={otherName} size={56} />
                <p className="mt-3 font-semibold text-gray-900 text-sm">
                  {otherName}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Mesaj göndererek sohbeti başlatın.
                </p>
              </div>
            ) : (
              messages.map((msg: Message, idx: number) => {
                const isMine = msg.senderId === currentUserId
                const isNotification = msg.messageType === "NOTIFICATION"
                const prevMsg = messages[idx - 1]
                const nextMsg = messages[idx + 1]
                const isLastInGroup =
                  nextMsg?.senderId !== msg.senderId ||
                  !nextMsg ||
                  nextMsg.messageType === "NOTIFICATION"
                const isFirstInGroup =
                  !prevMsg ||
                  prevMsg.senderId !== msg.senderId ||
                  prevMsg.messageType === "NOTIFICATION"

                if (isNotification) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isMine ? "flex-row-reverse" : "flex-row"
                    } group`}
                  >
                    {/* Other user avatar */}
                    {!isMine && (
                      <div className="flex-shrink-0 mb-1">
                        {isLastInGroup ? (
                          <Avatar
                            src={otherAvatarUrl}
                            name={otherName}
                            size={28}
                          />
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    )}

                    {/* My avatar */}
                    {isMine && (
                      <div className="flex-shrink-0 mb-1">
                        {isLastInGroup ? (
                          <Avatar
                            src={currentUserAvatarUrl}
                            name={currentUserName}
                            size={28}
                            gradient="from-blue-400 to-indigo-500"
                          />
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[65%] ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      {isFirstInGroup && (
                        <span
                          className={`text-[11px] font-medium mb-0.5 px-1 ${
                            isMine ? "text-amber-500" : "text-gray-500"
                          }`}
                        >
                          {isMine ? currentUserName : otherName}
                        </span>
                      )}

                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <button
                          onClick={() => setLightboxSrc(msg.imageUrl!)}
                          className={`cursor-zoom-in border-0 p-0 rounded-2xl overflow-hidden ${isMine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                        >
                          <Image
                            src={msg.imageUrl}
                            alt="Görsel mesaj"
                            width={240}
                            height={240}
                            className="object-cover max-h-60 rounded-2xl hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ) : (
                        <div
                          className={`px-4 py-2.5 rounded-[22px] text-sm leading-relaxed break-words ${
                            isMine
                              ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-br-sm"
                              : "bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-200"
                          }${
                            msg.deletedForAll ? " italic opacity-70" : ""
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}

                      {/* Three-dots menu trigger */}
                      {!msg.deletedForAll && (
                        <div className={`flex items-center ${
                          isMine ? "justify-end" : "justify-start"
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (deleteTarget === msg.id) {
                                setDeleteTarget(null)
                                setDeleteMenuPos(null)
                              } else {
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                setDeleteMenuPos(
                                  isMine
                                    ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                                    : { top: rect.bottom + 4, left: rect.left }
                                )
                                setDeleteTarget(msg.id)
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-400 hover:text-gray-700 flex-shrink-0"
                            title={MSG.CONFIRM_DELETE}
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isMine ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <span className="text-[10px] text-gray-400">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine &&
                          (msg.readAt ? (
                            <svg
                              className="w-[14px] h-[14px] text-amber-400"
                              viewBox="0 0 20 12"
                              fill="none"
                            >
                              <path
                                d="M1 6L5.5 10.5L14 2"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6 6L10.5 10.5L19 2"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-[14px] h-[14px] text-gray-400"
                              viewBox="0 0 20 12"
                              fill="none"
                            >
                              <path
                                d="M1 6L5.5 10.5L14 2"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6 6L10.5 10.5L19 2"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Typing indicator */}
            {isOtherTyping && (
              <div className="flex items-end gap-2">
                <Avatar src={otherAvatarUrl} name={otherName} size={28} />
                <div className="bg-white rounded-[22px] rounded-bl-sm shadow-sm border border-gray-200">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Bar — ADMIN_SUPPORT konuşmalarında gizlenir */}
          {isAdminSupportConv ? (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-gray-400">Bu konuşmada mesaj gönderemezsiniz.</p>
            </div>
          ) : (
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            {!isConnected && (
              <div className="mb-2 px-3 py-1.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                Bağlantı kesildi, yeniden bağlanılıyor…
              </div>
            )}
            {sendError && (
              <p className="text-xs text-red-500 px-1 pb-1">{sendError}</p>
            )}
            <div className="flex items-end gap-2 bg-gray-50 rounded-[28px] px-3 py-2 border border-gray-300 focus-within:border-amber-400 transition-colors">
              {/* Image upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0 mb-0.5"
                aria-label="Fotoğraf gönder"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
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

              {/* Pending image preview */}
              {pendingImagePreview && (
                <div className="relative flex-shrink-0 mb-0.5">
                  <img
                    src={pendingImagePreview}
                    alt="Gönderilecek görsel"
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200"
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

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yaz…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none py-1 leading-snug max-h-24 overflow-y-auto"
              />

              {/* Send button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={(!text.trim() && !pendingImage) || isSending}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5
                  disabled:text-gray-300 disabled:cursor-not-allowed
                  enabled:text-amber-500 enabled:hover:bg-amber-50"
                aria-label={MSG.SEND}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
          )}
        </div>
      ) : (
        /* Empty right panel */
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col items-center justify-center text-center p-8 bg-gray-50/30`}>
          <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {MSG.INBOX_TITLE}
          </h3>
          <p className="text-sm text-gray-400 max-w-[280px]">
            {MSG.INBOX_DESCRIPTION}
          </p>
        </div>
      )}
    </div>

    {/* Delete message dropdown (fixed, always on top) */}
    {deleteTarget && deleteMenuPos && (
      <>
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }}
        />
        <div
          style={{
            position: "fixed",
            top: deleteMenuPos.top,
            ...(deleteMenuPos.right !== undefined ? { right: deleteMenuPos.right } : { left: deleteMenuPos.left }),
            zIndex: 9999,
          }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-0.5 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleDeleteMessage(deleteTarget, false)}
            className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            {MSG.DELETE_FOR_ME}
          </button>
          <button
            disabled={messages.find((m) => m.id === deleteTarget)?.senderId !== currentUserId}
            onClick={() => handleDeleteMessage(deleteTarget, true)}
            className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {MSG.DELETE_FOR_ALL}
          </button>
          <button
            onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }}
            className="text-left text-xs px-3 py-1 text-gray-400 hover:text-gray-600"
          >
            {MSG.DELETE_CANCEL}
          </button>
        </div>
      </>
    )}

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
