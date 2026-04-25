import { useCallback, useEffect, useRef, useState } from "react"
import { ChatBubbleLeftRight, XMark } from "@medusajs/icons"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import type { Message } from "../../../lib/messenger/types"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return (
    <div
      className="rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

interface MessengerChatProps {
  /** Seller's own id */
  currentUserId: string
  /** Admin conversation id to connect to on mount */
  adminConversationId?: string
  /** Optional: override the other party's display name */
  otherName?: string
}

/**
 * Floating chat drawer for vendor panel.
 * Replaces AdminChat.tsx (TalkJS version).
 * Connects to the admin support conversation for the seller.
 */
export function MessengerChat({
  currentUserId,
  adminConversationId,
  otherName = "Destek",
}: MessengerChatProps) {
  const {
    messages,
    typingUserIds,
    isLoadingMessages,
    unreadCount,
    sendMessage,
    uploadImage,
    startTyping,
    stopTyping,
    openConversation,
    closeConversation,
    startConversation,
  } = useMessenger()

  const [isOpen, setIsOpen] = useState(false)
  const [convId, setConvId] = useState<string | null>(adminConversationId ?? null)
  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  void typingTimerRef

  // Open / close
  const handleOpen = useCallback(async () => {
    setIsOpen(true)
    let cid = convId
    if (!cid) {
      // Create admin-support conversation on first open
      cid = await startConversation({
        targetUserId: "admin",
        targetUserType: "ADMIN",
        subject: "Satıcı Destek",
      })
      setConvId(cid)
    }
    openConversation(cid)
  }, [convId, openConversation, startConversation])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    closeConversation()
  }, [closeConversation])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || isSending) return
    setIsSending(true)
    setText("")
    stopTyping()
    try {
      await sendMessage(content)
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
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage(file)
    } finally {
      e.target.value = ""
    }
  }

  const isOtherTyping = typingUserIds.length > 0
  const myMessages = messages.filter((m: { senderId: string }) => m.senderId === currentUserId)
  const lastMyMessageId = myMessages[myMessages.length - 1]?.id

  // Badge count (only when closed)
  const badge = !isOpen && unreadCount > 0

  return (
    <>
      {/* ── Floating Button ───────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all shadow-lg flex items-center justify-center text-white"
          aria-label="Destek Mesajları"
        >
          <ChatBubbleLeftRight className="w-6 h-6" />
          {badge && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Chat Drawer ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
            <Avatar name={otherName} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{otherName}</p>
              <p className="text-xs text-gray-400">Kayı Destek Ekibi</p>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Kapat"
            >
              <XMark className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <p className="text-sm text-gray-400">
                  Destek ekibimizle mesajlaşabilirsiniz.
                </p>
              </div>
            ) : (
              messages.map((msg: Message) => {
                const isMine = msg.senderId === currentUserId
                const isNotification = msg.messageType === "NOTIFICATION"
                const isLastMine = msg.id === lastMyMessageId

                if (isNotification) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} group`}
                  >
                    {!isMine && <Avatar name={otherName} size={24} />}
                    <div className={`flex flex-col max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <img
                          src={msg.imageUrl}
                          alt="Görsel"
                          className={`rounded-2xl object-cover max-h-48 ${isMine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                        />
                      ) : (
                        <div
                          className={`px-3.5 py-2 rounded-[20px] text-sm leading-relaxed break-words ${
                            isMine
                              ? "bg-blue-500 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}
                      <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                        {isMine && isLastMine && (
                          <span className="text-[10px] text-gray-400">
                            {msg.readAt ? "Görüldü" : "İletildi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {isOtherTyping && (
              <div className="flex items-end gap-2">
                <Avatar name={otherName} size={24} />
                <div className="bg-gray-100 rounded-[20px] rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-100 bg-white">
            <div className="flex items-end gap-2 bg-gray-50 rounded-[20px] px-3 py-2 border border-gray-200 focus-within:border-blue-400 transition-colors">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0 mb-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yaz..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-5 max-h-20 overflow-y-auto"
                style={{ minHeight: "20px" }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isSending}
                className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 mb-0.5 transition-all disabled:text-gray-300 enabled:text-blue-500 enabled:hover:bg-blue-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
