// Shared TypeScript types for kayi-messenger client
// Keep in sync with Prisma schema

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

// Notification payload emitted by the server
export interface NotificationPayload {
  type: string
  conversationId?: string
  senderName: string
  preview: string
}

// Read receipt payload
export interface ReadReceiptPayload {
  conversationId: string
  userId: string
  readAt: string
}

// Typing update payload
export interface TypingUpdatePayload {
  conversationId: string
  typingUserIds: string[]
}

// ── Messaging Context Types ─────────────────────────────────────────────────

export interface ProductContextData {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

export interface VendorContextData {
  id: string
  name: string
  handle: string
  photo: string | null
  storePhoto?: string | null
}

export type ProductMessageContext = { type: "PRODUCT"; data: ProductContextData }
export type VendorMessageContext = { type: "VENDOR"; data: VendorContextData }
export type MessageContext = ProductMessageContext | VendorMessageContext
