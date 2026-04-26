import { useState, useEffect, useRef, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Heading } from "@medusajs/ui"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
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
}: {
  conv: any
  isActive: boolean
  onOpen: (id: string) => void
}) {
  const other = getOtherParticipant(conv.participants ?? [])
  const isAdmin = other?.userType === "ADMIN"
  const isCustomer = other?.userType === "CUSTOMER" || other?.userId?.startsWith("cus_")

  // Customer name lookup
  const { displayName: customerDisplayName, avatarUrl: customerAvatarUrl } = useCustomerInfo(
    isCustomer ? other?.userId : undefined
  )

  const name = isAdmin
    ? "Destek Ekibi"
    : isCustomer
    ? customerDisplayName ?? other?.displayName ?? other?.userId ?? "Customer"
    : other?.displayName ?? other?.userId ?? "Bilinmiyor"

  const initials = (name || "?")[0]?.toUpperCase() ?? "?"
  const lastMsg = conv.messages?.[0]
  // Unread count for the SELLER participant (me)
  const unread = conv.participants?.find((p: any) => p.userType === "SELLER")?.unreadCount ?? 0

  return (
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ui-fg-base truncate">{name}</span>
            <span className="text-xs text-ui-fg-muted flex-shrink-0 ml-1">
              {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-ui-fg-muted truncate mt-0.5">
            {lastMsg
              ? lastMsg.messageType === "IMAGE"
                ? "📷 Fotoğraf"
                : lastMsg.content?.slice(0, 50)
              : conv.subject ?? "Henüz mesaj yok"}
          </p>
        </div>
      </div>
    </button>
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
    startTyping,
    stopTyping,
  } = useMessenger()

  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConv ? getOtherParticipant(activeConv.participants ?? []) : null
  const isOtherAdmin = otherParticipant?.userType === "ADMIN"
  const isOtherCustomer =
    otherParticipant?.userType === "CUSTOMER" || otherParticipant?.userId?.startsWith("cus_")

  const { displayName: customerDisplayName, avatarUrl: customerAvatarUrl } = useCustomerInfo(
    isOtherCustomer ? otherParticipant?.userId : undefined
  )

  const otherName = isOtherAdmin
    ? "Destek Ekibi"
    : isOtherCustomer
    ? customerDisplayName ?? otherParticipant?.displayName ?? "Customer"
    : otherParticipant?.displayName ?? "Bilinmiyor"

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
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 2000)
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

  // â”€â”€ Search (min 2 chars) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  return (
    <div className="flex h-[700px] border border-ui-border-base rounded-lg overflow-hidden">
      {/* â”€â”€ Left: Conversation list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="w-80 flex flex-col border-r border-ui-border-base bg-ui-bg-subtle flex-shrink-0">
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
                onOpen={openConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* â”€â”€ Right: Chat panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2">
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
                {" Â· "}
                {activeConv.participants?.length} participants
              </p>
            </div>
            <button
              onClick={closeConversation}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
              aria-label="Kapat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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
                <p className="text-xs text-ui-fg-muted mt-1">KonuÅŸmayÄ± baÅŸlatmak iÃ§in mesaj gÃ¶nderin.</p>
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
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                          : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.senderType}</p>
                      )}
                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <img src={msg.imageUrl} alt="GÃ¶rsel" className="max-w-full rounded-lg mb-1" />
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 opacity-60 text-right ${
                          isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isMe && isLastMine && msg.readAt && (
                          <span className="ml-1">Â· GÃ¶rÃ¼ldÃ¼</span>
                        )}
                      </p>
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
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
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
