import { useCallback, useEffect, useRef, useState } from "react"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
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
  /** Optional: override the other party's display name */
  otherName?: string
}

/**
 * Chat panel rendered inside the "Support" drawer in the vendor panel header.
 * On mount it fetches the real admin user ID from the backend and opens (or creates)
 * the admin-support conversation automatically.
 * The floating bottom-right button has been removed — the Drawer handles visibility.
 */
export function MessengerChat({
  currentUserId,
  otherName = "Destek",
}: MessengerChatProps) {
  const {
    messages,
    typingUserIds,
    isLoadingMessages,
    sendMessage,
    uploadImage,
    startTyping,
    stopTyping,
    openConversation,
    startConversation,
  } = useMessenger()

  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)
  void typingTimerRef

  // ── On mount: fetch real admin ID and open/create support conversation ──
  useEffect(() => {
    if (initializedRef.current || !currentUserId) return
    initializedRef.current = true

    fetchQuery("/vendor/support/admin-contact", { method: "GET" })
      .then((data: any) => {
        const adminUserId = data?.adminUserId
        if (!adminUserId) throw new Error("No admin user found")
        return startConversation({
          targetUserId: adminUserId,
          targetUserType: "ADMIN",
          type: "ADMIN_SUPPORT",
          subject: "Satıcı Destek",
        })
      })
      .then((cid) => {
        if (cid) openConversation(cid)
      })
      .catch((err) => {
        console.error(err)
        // Allow retry on next drawer open
        initializedRef.current = false
      })
      .finally(() => setIsInitializing(false))
  }, [currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom ─────────────────────────────────────────────────────
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
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 3000)
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
  const myMessages = messages.filter((m) => m.senderType === "SELLER")
  const lastMyMessageId = myMessages[myMessages.length - 1]?.id

  if (isInitializing && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
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
            const isMine = msg.senderType === "SELLER"
            const isNotification = msg.messageType === "NOTIFICATION"
            const isLastMine = msg.id === lastMyMessageId

            if (isNotification) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">
                    {msg.content}
                  </span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                      : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                  }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                >
                  {!isMine && (
                    <p className="text-xs font-medium mb-1 opacity-70">{otherName}</p>
                  )}
                  {msg.messageType === "IMAGE" && msg.imageUrl ? (
                    <img src={msg.imageUrl} alt="Görsel" className="max-w-full rounded-lg mb-1" />
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 opacity-60 text-right ${
                      isMine ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                    {isMine && isLastMine && msg.readAt && (
                      <span className="ml-1">· Görüldü</span>
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
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
