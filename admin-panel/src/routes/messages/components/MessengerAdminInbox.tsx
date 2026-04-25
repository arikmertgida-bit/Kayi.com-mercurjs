import { useEffect, useRef, useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  emitTypingStart,
  emitTypingStop,
  emitMessagesRead,
} from "../../../lib/messenger/socket"
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
} from "../../../lib/messenger/client"
import type { Conversation, Message } from "../../../lib/messenger/types"

interface Props {
  adminId: string
}

export function MessengerAdminInbox({ adminId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [typingIds, setTypingIds] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    getConversations()
      .then(({ conversations: c }) => setConversations(c))
      .catch(() => {})
  }, [])

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket()

    socket.on("connect", () => setIsConnected(true))
    socket.on("disconnect", () => setIsConnected(false))

    socket.on("new_message", (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                messages: [msg],
                updatedAt: msg.createdAt,
                participants: c.participants.map((p) =>
                  p.userId !== adminId ? { ...p, unreadCount: p.unreadCount + 1 } : p
                ),
              }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      )
    })

    socket.on(
      "typing_update",
      ({ conversationId, typingUserIds }: { conversationId: string; typingUserIds: string[] }) => {
        if (conversationId === selectedId) {
          setTypingIds(typingUserIds.filter((id) => id !== adminId))
        }
      }
    )

    socket.on(`user:${adminId}`, () => {
      getConversations()
        .then(({ conversations: c }) => setConversations(c))
        .catch(() => {})
    })

    return () => {
      disconnectSocket()
    }
  }, [adminId, selectedId])

  // ── Select conversation ───────────────────────────────────────────────────
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      if (selectedId) leaveConversation(selectedId)
      setSelectedId(conv.id)
      setMessages([])
      joinConversation(conv.id)
      emitMessagesRead(conv.id)
      await markConversationRead(conv.id).catch(() => {})
      const { messages: msgs } = await getMessages(conv.id).catch(() => ({ messages: [] }))
      setMessages(msgs)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                participants: c.participants.map((p) =>
                  p.userId === adminId ? { ...p, unreadCount: 0 } : p
                ),
              }
            : c
        )
      )
    },
    [selectedId, adminId]
  )

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !selectedId) return
    const text = input.trim()
    setInput("")
    await sendMessage(selectedId, text).catch(() => {})
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (!selectedId) return
    emitTypingStart(selectedId)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => emitTypingStop(selectedId), 2000)
  }

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.subject?.toLowerCase().includes(q) ||
      c.participants.some((p) => p.userId.toLowerCase().includes(q))
    )
  })

  const selectedConv = conversations.find((c) => c.id === selectedId)
  const myUnread = (conv: Conversation) =>
    conv.participants.find((p) => p.userId === adminId)?.unreadCount ?? 0

  const otherParticipant = (conv: Conversation) =>
    conv.participants.find((p) => p.userId !== adminId)

  return (
    <div className="flex h-[700px] border border-ui-border-base rounded-lg overflow-hidden">
      {/* ── Left: Conversation list ─────────────────────────────────────── */}
      <div className="w-80 flex flex-col border-r border-ui-border-base bg-ui-bg-subtle">
        <div className="p-3 border-b border-ui-border-base">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ui-fg-base font-semibold text-sm">Messages</span>
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-ui-fg-muted"}`}
            />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-ui-fg-muted text-sm mt-8">No conversations</p>
          )}
          {filtered.map((conv) => {
            const other = otherParticipant(conv)
            const unread = myUnread(conv)
            const lastMsg = conv.messages?.[0]
            const isActive = conv.id === selectedId
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left p-3 border-b border-ui-border-base transition-colors hover:bg-ui-bg-base-hover ${
                  isActive ? "bg-ui-bg-base" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-ui-tag-blue-bg flex items-center justify-center text-xs font-medium text-ui-tag-blue-text flex-shrink-0">
                    {(other?.userType ?? "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ui-fg-base truncate">
                        {conv.subject || other?.userId?.slice(0, 8) || "Chat"}
                      </span>
                      {unread > 0 && (
                        <span className="ml-1 bg-ui-tag-blue-bg text-ui-tag-blue-text text-xs rounded-full px-1.5 py-0.5 font-medium flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-ui-fg-muted truncate">
                        {lastMsg?.content ?? "No messages yet"}
                      </p>
                      <span className="text-xs text-ui-fg-muted flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-xs text-ui-tag-orange-text mt-0.5 block">
                      {other?.userType ?? ""}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: Chat area ────────────────────────────────────────────── */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-ui-tag-blue-bg flex items-center justify-center text-xs font-medium text-ui-tag-blue-text">
              {(otherParticipant(selectedConv)?.userType ?? "?")[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-ui-fg-base">
                {selectedConv.subject || "Chat"}
              </p>
              <p className="text-xs text-ui-fg-muted">
                {otherParticipant(selectedConv)?.userType}
                {" · "}
                {selectedConv.participants.length} participants
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
            {messages.map((msg) => {
              const isMe = msg.senderId === adminId
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
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.senderType}
                      </p>
                    )}
                    {msg.messageType === "IMAGE" && msg.imageUrl ? (
                      <img
                        src={msg.imageUrl}
                        alt="img"
                        className="max-w-full rounded-lg mb-1"
                      />
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 opacity-60 text-right ${
                        isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
            {typingIds.length > 0 && (
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-sm rounded-full border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-ui-fg-muted text-sm">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  )
}
