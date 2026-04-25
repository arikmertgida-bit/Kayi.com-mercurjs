import { useState, useEffect, useRef, useCallback } from "react"
import { Heading } from "@medusajs/ui"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
import type { Message } from "../../../lib/messenger/types"

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({
  name,
  size = 36,
  gradient = "from-violet-500 to-fuchsia-500",
}: {
  name: string
  size?: number
  gradient?: string
}) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

// ── Ticks ──────────────────────────────────────────────────────────────────

function Ticks({ readAt }: { readAt: string | null }) {
  if (readAt) {
    return (
      <svg className="w-[14px] h-[14px] text-blue-400 flex-shrink-0" viewBox="0 0 20 12" fill="none">
        <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="w-[14px] h-[14px] text-gray-400 flex-shrink-0" viewBox="0 0 20 12" fill="none">
      <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── TypingDots ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

// ── Customer info ──────────────────────────────────────────────────────────

interface CustomerInfo {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

function useCustomerInfo(customerId: string | undefined) {
  const [info, setInfo] = useState<CustomerInfo | null>(null)
  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!customerId) return
    if (!customerId.startsWith("cus_")) return
    if (fetchedRef.current.has(customerId)) return
    fetchedRef.current.add(customerId)
    fetchQuery<{ customer: CustomerInfo }>(`/vendor/customers/${customerId}`)
      .then(({ customer }) => setInfo(customer))
      .catch(() => { fetchedRef.current.delete(customerId) })
  }, [customerId])

  const displayName = info
    ? [info.first_name, info.last_name].filter(Boolean).join(" ") || info.email || customerId || "Customer"
    : null

  return { info, displayName }
}

// Vendor panelinde müşteri her zaman "cus_" prefix'li, satıcı "mem_" prefix'li
function getCustomerParticipant(participants: any[]) {
  return participants.find((p) => p.userId?.startsWith("cus_")) ?? null
}

// ── ConvRow ────────────────────────────────────────────────────────────────

function ConvRow({
  conv,
  isActive,
  onOpen,
}: {
  conv: any
  isActive: boolean
  onOpen: (id: string) => void
}) {
  const customer = getCustomerParticipant(conv.participants ?? [])
  const { displayName } = useCustomerInfo(customer?.userId)
  const name = displayName ?? customer?.displayName ?? customer?.userId ?? "Customer"
  const lastMsg = conv.messages?.[0]
  const unread = customer ? (conv.participants?.find((p: any) => !p.userId?.startsWith("cus_"))?.unreadCount ?? 0) : 0

  return (
    <button
      onClick={() => onOpen(conv.id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
        isActive ? "bg-blue-50 border-r-2 border-blue-500" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar name={name} size={44} gradient="from-violet-500 to-fuchsia-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm font-semibold truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>
            {name}
          </span>
          {conv.updatedAt && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {formatRelativeTime(conv.updatedAt)}
            </span>
          )}
        </div>
        {lastMsg && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {lastMsg.messageType === "IMAGE" ? "📷 Photo" : lastMsg.content?.slice(0, 50)}
          </p>
        )}
        {conv.subject && !lastMsg && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{conv.subject}</p>
        )}
      </div>
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

interface MessengerVendorInboxProps {
  sellerId: string
  sellerName?: string
}

export function MessengerVendorInbox({ sellerId, sellerName }: MessengerVendorInboxProps) {
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
    startTyping,
    stopTyping,
  } = useMessenger()

  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  // Vendor panelinde müşteri her zaman "cus_" prefix'li
  const customerParticipant = activeConv ? getCustomerParticipant(activeConv.participants ?? []) : null
  const { displayName: customerDisplayName } = useCustomerInfo(customerParticipant?.userId)
  const customerName = customerDisplayName ?? customerParticipant?.displayName ?? customerParticipant?.userId ?? "Müşteri"
  const isOtherTyping = typingUserIds.length > 0

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
    startTyping()
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

  return (
    <div className="flex h-full min-h-[700px]">
      {/* ── Conversation List ──────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <Heading level="h2" className="text-base font-bold text-gray-900">
            Messages
          </Heading>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
              <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-400">No messages yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onOpen={openConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {!activeConversationId ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700 text-base mb-1">Select a conversation</p>
            <p className="text-sm text-gray-400">Start messaging your customers</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
              <Avatar name={customerName} size={36} gradient="from-violet-500 to-fuchsia-500" />
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{customerName}</p>
                <p className="text-[11px] text-gray-400">Customer</p>
              </div>
              <button
                onClick={closeConversation}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Kapat"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scroll-smooth">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar name={customerName} size={56} gradient="from-violet-500 to-fuchsia-500" />
                  <p className="mt-3 font-semibold text-gray-900 text-sm">{customerName}</p>
                  <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation.</p>
                </div>
              ) : (
                <div className="space-y-[2px]">
                  {messages.map((msg: Message, idx: number) => {
                    // Vendor panelinde gönderen "cus_" ise müşteri, değilse satıcı
                    const isMine = !msg.senderId?.startsWith("cus_")
                    const isNotif = msg.messageType === "NOTIFICATION"
                    const nextMsg = messages[idx + 1]
                    const prevMsg = messages[idx - 1]

                    const isFirst =
                      !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.messageType === "NOTIFICATION"
                    const isLast =
                      !nextMsg || nextMsg.senderId !== msg.senderId || nextMsg.messageType === "NOTIFICATION"

                    if (isNotif) {
                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                            {msg.content}
                          </span>
                        </div>
                      )
                    }

                    // Instagram grouped bubble radius
                    const r = "20px"
                    const s = "5px"
                    const borderRadius = isMine
                      ? isFirst && isLast ? `${r} ${r} ${s} ${r}` : isFirst ? `${r} ${r} ${s} ${r}` : isLast ? `${r} ${s} ${s} ${r}` : `${r} ${s} ${s} ${r}`
                      : isFirst && isLast ? `${r} ${r} ${r} ${s}` : isFirst ? `${r} ${r} ${r} ${s}` : isLast ? `${s} ${r} ${r} ${s}` : `${s} ${r} ${r} ${s}`

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"} ${isFirst ? "mt-3" : "mt-[2px]"}`}
                      >
                        {/* Avatar — last in group only */}
                        <div className="w-7 flex-shrink-0 mb-0.5">
                          {isLast && (
                            isMine
                              ? <Avatar name={sellerName || "Me"} size={28} gradient="from-blue-500 to-indigo-600" />
                              : <Avatar name={customerName} size={28} gradient="from-violet-500 to-fuchsia-500" />
                          )}
                        </div>

                        <div className={`flex flex-col max-w-[62%] ${isMine ? "items-end" : "items-start"}`}>
                          {/* Name label — first of group */}
                          {isFirst && (
                            <span className={`text-[11px] font-medium mb-0.5 px-1 ${isMine ? "text-blue-500" : "text-gray-500"}`}>
                              {isMine ? (sellerName || "Me") : customerName}
                            </span>
                          )}

                          {msg.messageType === "IMAGE" && msg.imageUrl ? (
                            <img
                              src={msg.imageUrl}
                              alt="Image"
                              className="rounded-2xl object-cover max-h-52 shadow-sm"
                            />
                          ) : (
                            <div
                              className={`px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
                                isMine
                                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                                  : "bg-white border border-gray-200 text-gray-900"
                              }`}
                              style={{ borderRadius }}
                            >
                              {msg.content}
                            </div>
                          )}

                          <div className="flex items-center gap-1 mt-[3px] px-1">
                            <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                            {isMine && <Ticks readAt={msg.readAt} />}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {isOtherTyping && (
                    <div className="flex items-end gap-1.5 mt-3">
                      <Avatar name={customerName} size={28} gradient="from-violet-500 to-fuchsia-500" />
                      <div className="bg-white border border-gray-200 rounded-[20px] rounded-bl-[4px] shadow-sm">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 rounded-[28px] px-3 py-2 border border-gray-200 focus-within:border-blue-400 transition-colors">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0 mb-0.5"
                  aria-label="Send photo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none py-1 leading-snug max-h-24 overflow-y-auto"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || isSending || !activeConversationId}
                  aria-label="Send"
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5 ${
                    text.trim() && !isSending && activeConversationId
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-md"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
