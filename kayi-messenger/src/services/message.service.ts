import prisma from "../lib/prisma"
import { MessageType, UserType } from "@prisma/client"

export interface CreateMessageInput {
  conversationId: string
  senderId: string
  senderType: UserType
  content: string
  messageType?: MessageType
  imageUrl?: string
}

export const MessageService = {
  /**
   * Creates a new message and increments unread counts for all other participants.
   */
  async create(input: CreateMessageInput) {
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          senderType: input.senderType,
          content: input.content,
          messageType: input.messageType ?? MessageType.TEXT,
          imageUrl: input.imageUrl,
        },
      }),
      // Bump conversation updatedAt
      prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      }),
      // Increment unread count for all OTHER participants
      prisma.conversationParticipant.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: { not: input.senderId },
        },
        data: { unreadCount: { increment: 1 } },
      }),
    ])
    return message
  },

  /**
   * Returns paginated messages for a conversation (newest-first).
   */
  async list(conversationId: string, cursor?: string, limit = 30) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    })
  },
}
