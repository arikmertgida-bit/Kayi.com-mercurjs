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
} from "../../lib/messenger/socket"
import {
  getConversations,
  getMessages,
  getUnreadCount,
  findOrCreateConversation,
  markConversationRead,
  sendMessage as apiSendMessage,
  uploadImage as apiUploadImage,
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
    subject?: string
    productId?: string
    orderId?: string
  }) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  uploadImage: (file: File) => Promise<void>
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

  activeConvRef.current = activeConversationId

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
        setMessages((prev) => [...prev, msg])
        emitMessagesRead(msg.conversationId)
      } else {
        setUnreadCount((n) => n + 1)
      }
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

    const onNotification = (payload: NotificationPayload) => {
      showBrowserNotification(payload)
      setUnreadCount((n) => n + 1)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("message_received", onMessage)
    socket.on("typing_update", onTypingUpdate)
    socket.on("read_receipt", onReadReceipt)
    socket.on("notification", onNotification)

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
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConvRef.current) return
    await apiSendMessage(activeConvRef.current, content)
  }, [])

  const uploadImage = useCallback(async (file: File) => {
    if (!activeConvRef.current) return
    await apiUploadImage(activeConvRef.current, file)
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
