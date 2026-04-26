"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  emitTypingStart,
  emitTypingStop,
  emitMessagesRead,
  emitDeleteMessage,
} from "@/lib/messenger/socket"
import {
  getConversations,
  getMessages,
  getUnreadCount,
  findOrCreateConversation,
  markConversationRead,
  sendMessage as apiSendMessage,
  uploadImage as apiUploadImage,
  deleteMessage as apiDeleteMessage,
  deleteConversation as apiDeleteConversation,
  setMessengerAuthToken,
} from "@/lib/messenger/client"
import type {
  Conversation,
  Message,
  NotificationPayload,
  ReadReceiptPayload,
  TypingUpdatePayload,
} from "@/lib/messenger/types"

interface MessengerContextValue {
  // State
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  unreadCount: number
  typingUserIds: string[]
  isConnected: boolean
  isLoadingMessages: boolean
  isWidgetOpen: boolean

  // Actions
  openConversation: (conversationId: string) => void
  closeConversation: () => void
  openWidget: () => void
  closeWidget: () => void
  startConversation: (params: {
    targetUserId: string
    targetUserType: string
    subject?: string
    productId?: string
    orderId?: string
  }) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  uploadImage: (file: File) => Promise<void>
  deleteMessage: (messageId: string, deleteForAll: boolean) => Promise<void>
  deleteConversation: (conversationId: string, deleteForAll: boolean) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  markRead: (conversationId: string) => Promise<void>
  refreshConversations: () => Promise<void>
}

const MessengerContext = createContext<MessengerContextValue | null>(null)

export function useMessenger(): MessengerContextValue {
  const ctx = useContext(MessengerContext)
  if (!ctx) throw new Error("useMessenger must be used inside MessengerProvider")
  return ctx
}

export function useMessengerUnreadCount(): number {
  const ctx = useContext(MessengerContext)
  return ctx?.unreadCount ?? 0
}

interface MessengerProviderProps {
  children: React.ReactNode
  /** Pass the authenticated customer id. If null, provider renders children without connecting. */
  userId: string | null
  /** JWT token from the server-side HTTP-only cookie, passed so client can auth with kayi-messenger */
  authToken: string | null
  /** Customer's display name — sent in socket handshake so messenger can enrich notifications */
  userName?: string | null
}

export function MessengerProvider({ children, userId, authToken, userName }: MessengerProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvRef = useRef<string | null>(null)

  // Sync ref so socket callbacks always see latest value
  activeConvRef.current = activeConversationId

  // ── Browser Push Notification ────────────────────────────────────────────
  const showBrowserNotification = useCallback((payload: NotificationPayload) => {
    if (typeof window === "undefined") return
    if (document.visibilityState === "visible") return // tab is active, no push needed
    if (Notification.permission !== "granted") return

    new Notification(`${payload.senderName} sana mesaj gönderdi`, {
      body: payload.preview,
      icon: "/favicon.ico",
    })
  }, [])

  // ── Socket Setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    // Make token available to all HTTP client functions
    setMessengerAuthToken(authToken)

    const socket = connectSocket(authToken, userName)

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    const onMessage = (msg: Message) => {
      // Append to active conversation view
      if (msg.conversationId === activeConvRef.current) {
        setMessages((prev) => [...prev, msg])
        // Auto-mark as read when viewing
        emitMessagesRead(msg.conversationId)
      } else {
        // Bump unread count
        setUnreadCount((n) => n + 1)
      }
      // Refresh conversation list to update last message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, messages: [msg], updatedAt: msg.createdAt }
            : c
        )
      )
    }

    const onTypingUpdate = (payload: TypingUpdatePayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setTypingUserIds(payload.typingUserIds.filter((id) => id !== userId))
      }
    }

    const onReadReceipt = (payload: ReadReceiptPayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            !m.readAt && m.senderId === userId
              ? { ...m, readAt: payload.readAt }
              : m
          )
        )
      }
    }

    const onMessageDeleted = (payload: { messageId: string; conversationId: string; deleteForAll: boolean; content?: string }) => {
      if (payload.deleteForAll) {
        // Update message content to "[Bu mesaj silindi]" for everyone
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? { ...m, content: payload.content ?? "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
              : m
          )
        )
      } else {
        // "Delete for me": remove from local messages state
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
      }
    }

    const onNotification = (payload: NotificationPayload) => {
      showBrowserNotification(payload)
      setUnreadCount((n) => n + 1)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("message_received", onMessage)
    socket.on("typing_update", onTypingUpdate)
    socket.on("read_receipt", onReadReceipt)
    socket.on("message_deleted", onMessageDeleted)
    socket.on("notification", onNotification)
    socket.on("conversation_deleted", (payload: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
    })

    // Initial data
    Promise.all([
      getConversations().then((r) => setConversations(r.conversations)),
      getUnreadCount().then((r) => setUnreadCount(r.count)),
    ]).catch(console.error)

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("message_received", onMessage)
      socket.off("typing_update", onTypingUpdate)
      socket.off("read_receipt", onReadReceipt)
      socket.off("message_deleted", onMessageDeleted)
      socket.off("notification", onNotification)
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Actions ──────────────────────────────────────────────────────────────

  const openConversation = useCallback(async (conversationId: string) => {
    if (activeConvRef.current) {
      leaveConversation(activeConvRef.current)
    }
    // Update ref immediately so sendMessage works in the same async chain
    activeConvRef.current = conversationId
    setActiveConversationId(conversationId)
    setMessages([])
    setTypingUserIds([])
    setIsLoadingMessages(true)
    joinConversation(conversationId)
    emitMessagesRead(conversationId)

    try {
      const { messages } = await getMessages(conversationId)
      setMessages([...messages].reverse())
      await markConversationRead(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                participants: c.participants.map((p) =>
                  p.userId === userId ? { ...p, unreadCount: 0 } : p
                ),
              }
            : c
        )
      )
      // Recalculate total unread
      getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {})
    } finally {
      setIsLoadingMessages(false)
    }
  }, [userId])

  const closeConversation = useCallback(() => {
    if (activeConvRef.current) {
      leaveConversation(activeConvRef.current)
    }
    setActiveConversationId(null)
    setMessages([])
    setTypingUserIds([])
  }, [])

  const openWidget = useCallback(() => setIsWidgetOpen(true), [])
  const closeWidget = useCallback(() => {
    setIsWidgetOpen(false)
    closeConversation()
  }, [closeConversation])

  const startConversation = useCallback(
    async (params: {
      targetUserId: string
      targetUserType: string
      subject?: string
      productId?: string
      orderId?: string
    }): Promise<string> => {
      const { conversation } = await findOrCreateConversation(params)
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversation.id)
        return exists ? prev : [conversation, ...prev]
      })
      return conversation.id
    },
    []
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConvRef.current) return
      const convId = activeConvRef.current
      const { message } = await apiSendMessage(convId, content)
      // Optimistically add to state — dedup if socket also delivers it
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      )
      // Update conversations list with latest message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, messages: [message], updatedAt: message.createdAt } : c
        )
      )
    },
    []
  )

  const uploadImage = useCallback(async (file: File) => {
    if (!activeConvRef.current) return
    const convId = activeConvRef.current
    const { message } = await apiUploadImage(convId, file)
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    )
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [message], updatedAt: message.createdAt } : c
      )
    )
  }, [])

  const deleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    if (!activeConvRef.current) return
    const convId = activeConvRef.current
    // Optimistic update
    if (deleteForAll) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
            : m
        )
      )
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
    // Socket emit (also hits REST via socket handler)
    emitDeleteMessage(messageId, convId, deleteForAll)
    // Also call REST to ensure persistence if socket is temporarily down
    await apiDeleteMessage(convId, messageId, deleteForAll).catch((err) => {
      console.error("[deleteMessage] REST fallback error", err)
    })
  }, [])

  const deleteConversation = useCallback(async (conversationId: string, deleteForAll: boolean) => {
    // Optimistically remove from list immediately
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    if (activeConvRef.current === conversationId) {
      setActiveConversationId(null)
      activeConvRef.current = null
      setMessages([])
    }
    await apiDeleteConversation(conversationId, deleteForAll).catch((err) => {
      console.error("[deleteConversation] error", err)
    })
  }, [])

  const startTyping = useCallback(() => {
    if (!activeConvRef.current) return
    emitTypingStart(activeConvRef.current)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (activeConvRef.current) emitTypingStop(activeConvRef.current)
    }, 3000)
  }, [])

  const stopTyping = useCallback(() => {
    if (!activeConvRef.current) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    emitTypingStop(activeConvRef.current)
  }, [])

  const markRead = useCallback(async (conversationId: string) => {
    await markConversationRead(conversationId)
    emitMessagesRead(conversationId)
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              participants: c.participants.map((p) =>
                p.userId === userId ? { ...p, unreadCount: 0 } : p
              ),
            }
          : c
      )
    )
    getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {})
  }, [userId])

  const refreshConversations = useCallback(async () => {
    const [convsRes, countRes] = await Promise.all([
      getConversations(),
      getUnreadCount(),
    ])
    setConversations(convsRes.conversations)
    setUnreadCount(countRes.count)
  }, [])

  return (
    <MessengerContext.Provider
      value={{
        conversations,
        activeConversationId,
        messages,
        unreadCount,
        typingUserIds,
        isConnected,
        isLoadingMessages,
        isWidgetOpen,
        openConversation,
        closeConversation,
        openWidget,
        closeWidget,
        startConversation,
        sendMessage,
        uploadImage,
        deleteMessage,
        deleteConversation,
        startTyping,
        stopTyping,
        markRead,
        refreshConversations,
      }}
    >
      {children}
    </MessengerContext.Provider>
  )
}
