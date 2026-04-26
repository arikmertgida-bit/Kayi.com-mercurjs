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
   * Filters out messages deleted for the requesting user.
   */
  async list(conversationId: string, requesterId: string, cursor?: string, limit = 30) {
    return prisma.message.findMany({
      where: {
        conversationId,
        deletions: {
          none: { userId: requesterId },
        },
      },
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

  /**
   * Deletes a message:
   * - deleteForAll=true: marks content as deleted, visible to nobody (only sender can do this)
   * - deleteForAll=false: creates a MessageDeletion record so the requester stops seeing it
   */
  async deleteMessage(
    messageId: string,
    requesterId: string,
    deleteForAll: boolean
  ) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { select: { userId: true } } },
        },
      },
    })

    if (!message) throw new Error("Message not found")

    // Check requester is a participant
    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === requesterId
    )
    if (!isParticipant) throw new Error("Forbidden")

    if (deleteForAll) {
      // Only the original sender may delete for everyone
      if (message.senderId !== requesterId) throw new Error("Only the sender can delete for all")

      return prisma.message.update({
        where: { id: messageId },
        data: {
          deletedForAll: true,
          deletedAt: new Date(),
          content: "[Bu mesaj silindi]",
          imageUrl: null,
        },
      })
    } else {
      // "Delete for me" — upsert to handle duplicate calls gracefully
      await prisma.messageDeletion.upsert({
        where: { messageId_userId: { messageId, userId: requesterId } },
        update: {},
        create: { messageId, userId: requesterId },
      })
      return prisma.message.findUnique({ where: { id: messageId } })
    }
  },
}
