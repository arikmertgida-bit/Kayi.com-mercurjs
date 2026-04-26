// Shared TypeScript types for kayi-messenger client
// Mirrors storefront/src/lib/messenger/types.ts — keep in sync

export type UserType = "CUSTOMER" | "SELLER" | "ADMIN"
export type MessageType = "TEXT" | "IMAGE" | "NOTIFICATION"
export type ConversationType = "DIRECT" | "ADMIN_SUPPORT"

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
  subject: string | null
  productId: string | null
  orderId: string | null
  createdAt: string
  updatedAt: string
  participants: Participant[]
  messages: Message[]
}

export interface NotificationPayload {
  type: "new_message" | "review_notification"
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
