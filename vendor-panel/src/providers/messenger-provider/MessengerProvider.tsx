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
} from "../../lib/messenger/socket"
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
} from "../../lib/messenger/client"
import type {
  Conversation,
  Message,
  NotificationPayload,
  ReadReceiptPayload,
  TypingUpdatePayload,
} from "../../lib/messenger/types"

// ── Context ────────────────────────────────────────────────────────────────

interface MessengerContextValue {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  unreadCount: number
  typingUserIds: string[]
  isConnected: boolean
  isLoadingMessages: boolean

  openConversation: (conversationId: string) => void
  closeConversation: () => void
  startConversation: (params: {
    targetUserId: string
    targetUserType: string
    type?: string
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

/**
 * Drop-in replacement for the old `useTalkjsUnreads` hook.
 * Returns an array-like value where the first element is the unreads count,
 * so existing code that reads `unreads?.length` or maps over it is compatible.
 */
export function useMessengerUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  const count = ctx?.unreadCount ?? 0
  // Return an array with `count` items so `.length` gives the unread count
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

/**
 * Returns unread count only for ADMIN_SUPPORT conversations.
 * Used by the Support button in the header so its badge reflects only
 * admin-support messages, not customer traffic.
 */
export function useMessengerAdminUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  if (!ctx) return []
  const { conversations } = ctx
  const count = conversations
    .filter((c) => c.type === "ADMIN_SUPPORT")
    .reduce((sum, c) => {
      const selfParticipant = c.participants.find(
        (p) => p.userType === "SELLER"
      )
      return sum + (selfParticipant?.unreadCount ?? 0)
    }, 0)
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

export function useMessenger(): MessengerContextValue {
  const ctx = useContext(MessengerContext)
  if (!ctx) throw new Error("useMessenger must be used inside MessengerProvider")
  return ctx
}

// ── Provider ───────────────────────────────────────────────────────────────

interface MessengerProviderProps {
  children: React.ReactNode
  /** Authenticated seller id from useMe() */
  sellerId: string | null
  sellerName?: string
}

export function MessengerProvider({ children, sellerId, sellerName }: MessengerProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvRef = useRef<string | null>(null)
  const conversationsRef = useRef<Conversation[]>([])

  activeConvRef.current = activeConversationId
  conversationsRef.current = conversations

  // Browser notification
  const showBrowserNotification = useCallback((payload: NotificationPayload) => {
    if (typeof window === "undefined") return
    if (document.visibilityState === "visible") return
    if (Notification.permission !== "granted") return
    new Notification(`${payload.senderName} sana mesaj gönderdi`, {
      body: payload.preview,
      icon: "/favicon.ico",
    })
  }, [])

  // Socket setup
  useEffect(() => {
    if (!sellerId) return

    const socket = connectSocket(sellerName)

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    const onMessage = (msg: Message) => {
      if (msg.conversationId === activeConvRef.current) {
        setMessages((prev) => {
          // Deduplicate: skip if already present (e.g. from optimistic update)
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        emitMessagesRead(msg.conversationId)
      } else {
        setUnreadCount((n) => n + 1)
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId)
        if (!exists) {
          // New conversation arrived (e.g. first customer message) — refresh list
          getConversations()
            .then((r) => {
              setConversations(r.conversations)
              setUnreadCount((n) => n + 1)
            })
            .catch(() => {})
          return prev
        }
        return prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, messages: [msg], updatedAt: msg.createdAt }
            : c
        )
      })
    }

    const onTypingUpdate = (payload: TypingUpdatePayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setTypingUserIds(payload.typingUserIds.filter((id) => id !== sellerId))
      }
    }

    const onReadReceipt = (payload: ReadReceiptPayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            !m.readAt && m.senderId === sellerId
              ? { ...m, readAt: payload.readAt }
              : m
          )
        )
      }
    }

    const onMessageDeleted = (payload: { messageId: string; conversationId: string; deleteForAll: boolean; content?: string }) => {
      if (payload.deleteForAll) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? { ...m, content: payload.content ?? "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
              : m
          )
        )
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
      }
    }

    const onNotification = (payload: NotificationPayload) => {
      showBrowserNotification(payload)
      // If the notification references a conversation we don't have yet,
      // refresh the full list so new conversations (e.g. first customer message) appear
      if (
        payload.conversationId &&
        !conversationsRef.current.some((c) => c.id === payload.conversationId)
      ) {
        getConversations()
          .then((r) => {
            setConversations(r.conversations)
            getUnreadCount().then((r2) => setUnreadCount(r2.count)).catch(() => {})
          })
          .catch(() => {})
      } else {
        setUnreadCount((n) => n + 1)
      }
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

    Promise.all([
      getConversations().then((r) => setConversations(r.conversations)),
      getUnreadCount().then((r) => setUnreadCount(r.count)),
    ]).catch(console.error)

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
  }, [sellerId])

  const openConversation = useCallback(async (conversationId: string) => {
    if (activeConvRef.current) leaveConversation(activeConvRef.current)
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
      getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {})
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  const closeConversation = useCallback(() => {
    if (activeConvRef.current) leaveConversation(activeConvRef.current)
    setActiveConversationId(null)
    setMessages([])
    setTypingUserIds([])
  }, [])

  const startConversation = useCallback(async (params: {
    targetUserId: string
    targetUserType: string
    type?: string
    subject?: string
    productId?: string
    orderId?: string
  }): Promise<string> => {
    const { conversation } = await findOrCreateConversation(params as any)
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conversation.id)
      return exists ? prev : [conversation, ...prev]
    })
    return conversation.id
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConvRef.current) return
    const { message } = await apiSendMessage(activeConvRef.current, content)
    // Optimistically add to UI — socket deduplication prevents duplicates
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  const uploadImage = useCallback(async (file: File) => {
    if (!activeConvRef.current) return
    await apiUploadImage(activeConvRef.current, file)
  }, [])

  const deleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    if (!activeConvRef.current) return
    const convId = activeConvRef.current
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
    emitDeleteMessage(messageId, convId, deleteForAll)
    await apiDeleteMessage(convId, messageId, deleteForAll).catch((err) => {
      console.error("[deleteMessage] REST fallback error", err)
    })
  }, [])

  const deleteConversation = useCallback(async (conversationId: string, deleteForAll: boolean) => {
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
    getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {})
  }, [])

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
        openConversation,
        closeConversation,
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
