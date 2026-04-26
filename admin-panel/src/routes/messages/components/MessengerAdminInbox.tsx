import { useEffect, useMemo, useRef, useState, useCallback } from "react"
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
import { useSellerMembers } from "../../../hooks/api/sellers"

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Seller data for participant display Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const { members: sellerMembers } = useSellerMembers()

  const sellerByMemberId = useMemo(() => {
    const map = new Map<string, { name: string; photo: string | null }>()
    sellerMembers?.forEach((m) => {
      if (m.id && m.seller) {
        const info = { name: m.seller.name ?? "Seller", photo: m.photo ?? null }
        // Map by member ID (mem_...)
        map.set(m.id, info)
        // Map by seller ID (sel_...) as fallback for conversations using seller ID directly
        if (m.seller.id && !map.has(m.seller.id)) {
          map.set(m.seller.id, { name: m.seller.name ?? "Seller", photo: m.photo ?? (m.seller as any).photo ?? null })
        }
      }
    })
    return map
  }, [sellerMembers])

  // Ã¢â€â‚¬Ã¢â€â‚¬ Initial load Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    getConversations()
      .then(({ conversations: c }) =>
        setConversations(
          [...c].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        )
      )
      .catch(() => {})

    if (typeof window !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // Ã¢â€â‚¬Ã¢â€â‚¬ Socket Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    const socket = connectSocket()

    socket.on("connect", () => setIsConnected(true))
    socket.on("disconnect", () => setIsConnected(false))

    // BUG-1 FIX: server emits "message_received", not "new_message"
    socket.on("message_received", (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      )
      setConversations((prev) =>
        prev
          .map((c) =>
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
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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

    // Read receipt: stamp readAt on our sent messages
    socket.on(
      "read_receipt",
      ({ conversationId, readAt }: { conversationId: string; readAt: string }) => {
        if (conversationId === selectedId) {
          setMessages((prev) =>
            prev.map((m) =>
              !m.readAt && m.senderId === adminId ? { ...m, readAt } : m
            )
          )
        }
      }
    )

    // Notification: new message from absent conversation
    socket.on(
      "notification",
      (payload: { senderName?: string; preview?: string }) => {
        if (
          typeof window !== "undefined" &&
          document.visibilityState !== "visible" &&
          Notification.permission === "granted"
        ) {
          new Notification(
            payload.senderName ? `${payload.senderName} mesaj gönderdi` : "Yeni mesaj",
            { body: payload.preview ?? "", icon: "/favicon.ico" }
          )
        }
        getConversations()
          .then(({ conversations: c }) =>
            setConversations(
              [...c].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            )
          )
          .catch(() => {})
      }
    )

    return () => {
      disconnectSocket()
    }
  }, [adminId, selectedId])

  // Ã¢â€â‚¬Ã¢â€â‚¬ Select conversation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      if (selectedId) leaveConversation(selectedId)
      setSelectedId(conv.id)
      setMessages([])
      joinConversation(conv.id)
      emitMessagesRead(conv.id)
      await markConversationRead(conv.id).catch(() => {})
      const { messages: msgs } = await getMessages(conv.id).catch(() => ({ messages: [] }))
      // API returns newest-first; reverse for oldest-at-top display
      setMessages([...msgs].reverse())
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auto-scroll Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Ã¢â€â‚¬Ã¢â€â‚¬ Send message Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const otherParticipant = (conv: Conversation) =>
    conv.participants.find((p) => p.userId !== adminId)

  const getParticipantInfo = useCallback(
    (conv: Conversation): { name: string; photo: string | null } => {
      const other = otherParticipant(conv)
      if (!other) return { name: "Unknown", photo: null }
      const sellerInfo = sellerByMemberId.get(other.userId)
      if (sellerInfo) return sellerInfo
      if (other.userType === "CUSTOMER") return { name: other.userId?.slice(0, 8) || "Customer", photo: null }
      return { name: other.userId?.slice(0, 8) || other.userType, photo: null }
    },
    [sellerByMemberId]
  )

  const myUnread = (conv: Conversation) =>
    conv.participants.find((p) => p.userId === adminId)?.unreadCount ?? 0

  // Ã¢â€â‚¬Ã¢â€â‚¬ Search (min 2 chars, by seller name or subject) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const filtered =
    search.length < 2
      ? conversations
      : conversations.filter((c) => {
          const q = search.toLowerCase()
          const { name } = getParticipantInfo(c)
          return name.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q)
        })

  const selectedConv = conversations.find((c) => c.id === selectedId)

  return (
    <div className="flex h-[700px] border border-ui-border-base rounded-lg overflow-hidden">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Left: Conversation list Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="w-80 flex flex-col border-r border-ui-border-base bg-ui-bg-subtle">
        <div className="p-3 border-b border-ui-border-base">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ui-fg-base font-semibold text-sm">Messages</span>
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-ui-fg-muted"}`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
          <input
            type="text"
            placeholder="Search by store name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-ui-fg-muted text-sm mt-8">No conversations</p>
          )}
          {filtered.map((conv) => {
            const { name, photo } = getParticipantInfo(conv)
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
                  <div className="relative flex-shrink-0">
                    {photo ? (
                      <img
                        src={photo}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ui-tag-blue-bg flex items-center justify-center text-xs font-medium text-ui-tag-blue-text">
                        {name[0]?.toUpperCase() ?? "?"}
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
                      <span className="text-sm font-medium text-ui-fg-base truncate">
                        {name}
                      </span>
                      <span className="text-xs text-ui-fg-muted flex-shrink-0 ml-1">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-ui-fg-muted truncate mt-0.5">
                      {lastMsg?.content ?? conv.subject ?? "No messages yet"}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Right: Chat area Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2">
            {(() => {
              const { name, photo } = getParticipantInfo(selectedConv)
              return (
                <>
                  {photo ? (
                    <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ui-tag-blue-bg flex items-center justify-center text-xs font-medium text-ui-tag-blue-text flex-shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-ui-fg-base">{name}</p>
                    <p className="text-xs text-ui-fg-muted">
                      {otherParticipant(selectedConv)?.userType}
                      {" · "}
                      {selectedConv.participants.length} participants
                    </p>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
            {messages.map((msg) => {
              const isMe = msg.senderId === adminId
              if (msg.messageType === "NOTIFICATION") {
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
                      <img src={msg.imageUrl} alt="img" className="max-w-full rounded-lg mb-1" />
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 opacity-60 text-right ${
                        isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      {isMe && msg.readAt && <span className="ml-1">· Görüldü</span>}
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
