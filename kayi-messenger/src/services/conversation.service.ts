import prisma from "../lib/prisma"
import { ConversationType, UserType } from "@prisma/client"

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

    // Try to find existing conversation with both participants
    const existing = await prisma.conversation.findFirst({
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

    // Create new conversation
    return prisma.conversation.create({
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
  },

  /**
   * Returns all conversations for a given user with last message and unread count.
   */
  async listForUser(userId: string) {
    return prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    })
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
