import prisma from "../lib/prisma"
import { ConversationType, Prisma, UserType } from "@prisma/client"

export interface FindOrCreateConversationInput {
  participantAId: string
  participantAType: UserType
  participantBId: string
  participantBType: UserType
  subject?: string
  productId?: string
  orderId?: string
  type?: ConversationType
}

export const ConversationService = {
  /**
   * Finds an existing direct conversation between two participants,
   * or creates one if none exists.
   */
  async findOrCreate(input: FindOrCreateConversationInput) {
    const { participantAId, participantAType, participantBId, participantBType, subject, productId, orderId, type } = input

    return prisma.$transaction(async (tx) => {
      // Try to find existing conversation with both participants.
      // Running inside a SERIALIZABLE transaction prevents a race condition
      // where two concurrent requests both see no conversation and both insert.
      const existing = await tx.conversation.findFirst({
        where: {
          type: type ?? ConversationType.DIRECT,
          ...(productId ? { productId } : {}),
          ...(orderId ? { orderId } : {}),
          participants: {
            every: {
              userId: { in: [participantAId, participantBId] },
            },
          },
        },
        include: {
          participants: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (existing && existing.participants.length === 2) {
        return existing
      }

      return tx.conversation.create({
        data: {
          type: type ?? ConversationType.DIRECT,
          subject,
          productId,
          orderId,
          participants: {
            create: [
              { userId: participantAId, userType: participantAType },
              { userId: participantBId, userType: participantBType },
            ],
          },
        },
        include: {
          participants: true,
          messages: true,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  },

  /**
   * Returns conversations for a given user with last message and unread count.
   * Filters out conversations the user has hidden.
   * Supports pagination via limit/offset to prevent unbounded queries.
   */
  async listForUser(userId: string, limit = 20, offset = 0) {
    return prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        hides: { none: { userId } },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    })
  },

  /**
   * Hides a conversation for a specific user (soft delete — "Sadece Benden Sil").
   * The conversation still exists for other participants.
   */
  async hideForUser(conversationId: string, userId: string) {
    await prisma.conversationHide.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId },
      update: {},
    })
  },

  /**
   * Hard-deletes a conversation and all its messages ("Herkesten Sil").
   * Only the conversation owner / a participant can call this.
   */
  async deleteForAll(conversationId: string, requesterId: string) {
    // Verify requester is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: requesterId },
    })
    if (!participant) {
      throw new Error("NOT_PARTICIPANT")
    }
    await prisma.conversation.delete({ where: { id: conversationId } })
  },

  /**
   * Returns the total unread message count for a user across all conversations.
   */
  async totalUnreadCount(userId: string): Promise<number> {
    const result = await prisma.conversationParticipant.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    })
    return result._sum.unreadCount ?? 0
  },

  /**
   * Marks all messages in a conversation as read for the given user.
   */
  async markAsRead(conversationId: string, userId: string) {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    })

    // Also stamp readAt on unread messages not sent by this user
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })
  },
}
