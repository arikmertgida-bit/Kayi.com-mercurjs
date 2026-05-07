export type UserType = "CUSTOMER" | "SELLER" | "ADMIN"
export type MessageType = "TEXT" | "IMAGE" | "NOTIFICATION"
export type ConversationType = "DIRECT" | "ADMIN_SUPPORT"
export type ConversationContextType = "PRODUCT_BASED" | "VENDOR_BASED"

export interface Participant {
  id: string
  conversationId: string
  userId: string
  userType: UserType
  unreadCount: number
  lastReadAt: string | null
  joinedAt: string
  /** Display name enriched from server-side cache. Null when not yet cached. */
  displayName: string | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderType: UserType
  content: string
  messageType: MessageType
  imageUrl: string | null
  readAt: string | null
  createdAt: string
  deletedForAll?: boolean
}

export interface Conversation {
  id: string
  type: ConversationType
  contextType: ConversationContextType
  subject: string | null
  productId: string | null
  orderId: string | null
  createdAt: string
  updatedAt: string
  participants: Participant[]
  messages: Message[]
}

export interface NotificationPayload {
  type: string
  conversationId?: string
  senderName: string
  preview: string
}

export interface ReadReceiptPayload {
  conversationId: string
  userId: string
  readAt: string
}

export interface TypingUpdatePayload {
  conversationId: string
  typingUserIds: string[]
}

export interface ProductContextData {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

export type MessageContext =
  | { type: "PRODUCT"; data: ProductContextData }
  | { type: "VENDOR"; data: Record<string, never> }
