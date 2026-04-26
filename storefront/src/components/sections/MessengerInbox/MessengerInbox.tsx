"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useMessenger } from "@/providers/MessengerProvider"
import { MSG } from "@/lib/messenger/strings"
import { useSellerAvatar } from "@/hooks/useSellerAvatar"
import type { Conversation, Message } from "@/lib/messenger/types"

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

// ── ConvRow ───────────────────────────────────────────────────────────────────

function ConvRow({
  conv,
  currentUserId,
  isActive,
  onOpen,
  onDelete,
}: {
  conv: Conversation
  currentUserId: string
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}) {
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  const me = conv.participants.find((p) => p.userId === currentUserId)
  const unread = me?.unreadCount ?? 0
  const lastMsg = conv.messages?.[0]
  const otherName = other?.displayName ?? other?.userId ?? MSG.UNKNOWN_USER

  const isSeller = other?.userType === "SELLER"
  const { avatarUrl } = useSellerAvatar(isSeller ? other?.userId : undefined)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
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
        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-all hover:bg-gray-50 ${
          isActive
            ? "bg-amber-50 border-l-[3px] border-l-amber-400"
            : "border-l-[3px] border-l-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar
              src={isSeller ? avatarUrl : null}
              name={otherName}
              size={44}
            />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-sm truncate ${
                  unread > 0
                    ? "font-semibold text-gray-900"
                    : "font-medium text-gray-700"
                }`}
              >
                {conv.subject ?? otherName}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                {formatRelative(conv.updatedAt)}
              </span>
            </div>
            <p
              className={`text-xs truncate ${
                unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"
              }`}
            >
              {lastMsg
                ? lastMsg.messageType === "IMAGE"
                  ? MSG.IMAGE_MESSAGE
                  : lastMsg.content
                : MSG.NO_MESSAGE_YET}
            </p>
          </div>
        </div>
      </button>

      {/* 3-dot menu button */}
      <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Sohbet seçenekleri"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute z-50 right-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden text-sm">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(conv.id, false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Sadece Benden Sil
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(conv.id, true) }}
              className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors"
            >
              Herkesten Sil
            </button>
          </div>
        )}
      </div>
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConv?.participants.find(
    (p) => p.userId !== currentUserId
  )
  const otherName =
    otherParticipant?.displayName ??
    otherParticipant?.userId ??
    MSG.UNKNOWN_USER

  const isSeller = otherParticipant?.userType === "SELLER"
  const { avatarUrl: sellerAvatarUrl } = useSellerAvatar(
    isSeller ? otherParticipant?.userId : undefined
  )
  const otherAvatarUrl = isSeller ? sellerAvatarUrl : null
  const isOtherTyping = typingUserIds.length > 0

  // Product context: fetch product info when conversation has productId
  const [productInfo, setProductInfo] = useState<{ title: string; thumbnail: string | null } | null>(null)
  useEffect(() => {
    const pid = activeConv?.productId
    if (!pid) { setProductInfo(null); return }
    const apiBase = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
    fetch(`${apiBase}/store/products/${pid}`, {
      headers: { "x-publishable-api-key": publishableKey },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.product) {
          setProductInfo({ title: data.product.title, thumbnail: data.product.thumbnail })
        } else {
          setProductInfo(null)
        }
      })
      .catch(() => setProductInfo(null))
  }, [activeConv?.productId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUserIds])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [text])

  // Reset send error when switching conversations
  useEffect(() => {
    setSendError(null)
    setText("")
  }, [activeConversationId])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || isSending) return
    setIsSending(true)
    setSendError(null)
    setText("")
    stopTyping()
    try {
      await sendMessage(content)
    } catch (err) {
      console.error("[MessengerInbox] send error:", err)
      setText(content)
      setSendError("Mesaj gönderilemedi. Tekrar deneyin.")
    } finally {
      setIsSending(false)
    }
  }, [text, isSending, sendMessage, stopTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    startTyping()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 2000)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage(file)
    } catch (err) {
      console.error("[MessengerInbox] image upload error:", err)
    } finally {
      e.target.value = ""
    }
  }

  const handleDeleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    setDeleteTarget(null)
    try {
      await deleteMessage(messageId, deleteForAll)
    } catch (err) {
      console.error("[MessengerInbox] delete error:", err)
    }
  }, [deleteMessage])

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
    <div className="flex h-[700px] border border-gray-300 rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* ── Left: Conversation List ──────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200">
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
              <ConvRow
                key={conv.id}
                conv={conv}
                currentUserId={currentUserId}
                isActive={conv.id === activeConversationId}
                onOpen={openConversation}
                onDelete={deleteConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat Panel ────────────────────────────────────────────────── */}
      {activeConv && otherParticipant ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-white">
            <Avatar src={otherAvatarUrl} name={otherName} size={40} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {otherName}
              </p>
              <p className="text-xs text-gray-400">Mesaj bırakabilirsiniz</p>
            </div>
            <button
              onClick={closeConversation}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label={MSG.CLOSE}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Product context banner */}
          {productInfo && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-amber-100">
                {productInfo.thumbnail ? (
                  <Image src={productInfo.thumbnail} alt={productInfo.title} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 font-medium">Ürün hakkında soru</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{productInfo.title}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Ürün</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/40 scroll-smooth">
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
                    onClick={() => deleteTarget === msg.id && setDeleteTarget(null)}
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
                        <Image
                          src={msg.imageUrl}
                          alt="Görsel mesaj"
                          width={240}
                          height={240}
                          className={`object-cover max-h-60 rounded-2xl ${
                            isMine ? "rounded-br-sm" : "rounded-bl-sm"
                          }`}
                        />
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

                      {/* Trash icon + delete popup */}
                      {!msg.deletedForAll && (
                        <div className={`relative flex items-center ${
                          isMine ? "justify-end" : "justify-start"
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(deleteTarget === msg.id ? null : msg.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex-shrink-0"
                            title={MSG.CONFIRM_DELETE}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {deleteTarget === msg.id && (
                            <div
                              className={`absolute z-50 bottom-8 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-0.5 min-w-[160px] ${
                                isMine ? "right-0" : "left-0"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleDeleteMessage(msg.id, false)}
                                className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700"
                              >
                                {MSG.DELETE_FOR_ME}
                              </button>
                              <button
                                disabled={msg.senderId !== currentUserId}
                                onClick={() => handleDeleteMessage(msg.id, true)}
                                className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {MSG.DELETE_FOR_ALL}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(null)}
                                className="text-left text-xs px-3 py-1 text-gray-400 hover:text-gray-600"
                              >
                                {MSG.DELETE_CANCEL}
                              </button>
                            </div>
                          )}
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

          {/* Input Bar */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
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
                disabled={!text.trim() || isSending}
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
        </div>
      ) : (
        /* Empty right panel */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
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
  )
}
