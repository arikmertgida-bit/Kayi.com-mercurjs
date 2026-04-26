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
