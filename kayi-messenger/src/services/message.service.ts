import prisma from "../lib/prisma"
import { MessageType, UserType, Prisma } from "@prisma/client"

export interface CreateMessageInput {
  conversationId: string
  senderId: string
  senderType: UserType
  content: string
  messageType?: MessageType
  imageUrl?: string
  metadata?: Record<string, unknown>
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
          ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonObject } : {}),
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
   * - deleteForAll=true: hard-deletes the message (ADMIN can delete any; others only their own)
   * - deleteForAll=false: creates a MessageDeletion record so the requester stops seeing it
   */
  async deleteMessage(
    messageId: string,
    requesterId: string,
    deleteForAll: boolean,
    requesterType: string = "CUSTOMER"
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
      // Admin can delete any message; others can only delete their own
      if (requesterType !== "ADMIN" && message.senderId !== requesterId) {
        throw new Error("Only the sender can delete for all")
      }

      await prisma.message.delete({ where: { id: messageId } })
      return null
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

  /**
   * Hard-deletes all PROMOTION-type messages that contain the given promotion_id
   * OR promotionCode in their metadata JSON field.
   * Called when a promotion is deleted so users no longer see outdated cards.
   * promotionCode fallback handles legacy messages created before promotion_id was added.
   */
  async deleteByPromotionId(promotionId: string, promotionCode?: string): Promise<number> {
    // Prisma 5 PostgreSQL JSONB path filter — match by promotion_id (primary key)
    const conditions: Prisma.MessageWhereInput[] = [
      {
        messageType: "PROMOTION",
        metadata: { path: ["promotion_id"], equals: promotionId },
      },
    ]

    // Fallback: also delete by promotionCode for messages created before promotion_id was added
    if (promotionCode) {
      conditions.push({
        messageType: "PROMOTION",
        metadata: { path: ["promotionCode"], equals: promotionCode },
      })
    }

    const result = await prisma.message.deleteMany({
      where: { OR: conditions },
    })
    return result.count
  },
}
