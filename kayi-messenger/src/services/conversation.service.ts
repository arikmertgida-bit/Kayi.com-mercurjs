import prisma from "../lib/prisma"
import { ConversationType, ConversationContextType, Prisma, UserType } from "@prisma/client"

export interface FindOrCreateConversationInput {
  participantAId: string
  participantAType: UserType
  participantBId: string
  participantBType: UserType
  subject?: string
  productId?: string
  orderId?: string
  type?: ConversationType
  contextType?: ConversationContextType
  metadata?: Record<string, unknown>
}

/**
 * Retries a SERIALIZABLE transaction on serialization failure (PostgreSQL error 40001 / Prisma P2034).
 * Uses truncated exponential backoff with jitter to avoid thundering-herd under high concurrency.
 */
async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
  baseDelayMs = 50
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isSerializationError =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034"
      if (!isSerializationError || attempt === maxAttempts) throw err
      const jitter = Math.random() * 30
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, 500)
      await new Promise<void>((resolve) => setTimeout(resolve, delay))
    }
  }
  // TypeScript control-flow: unreachable — the loop always returns or throws
  throw new Error("withSerializableRetry: unreachable")
}

export const ConversationService = {
  /**
   * Finds an existing direct conversation between two participants,
   * or creates one if none exists.
   */
  async findOrCreate(input: FindOrCreateConversationInput) {
    const { participantAId, participantAType, participantBId, participantBType, subject, productId, orderId, type, contextType, metadata } = input

    // Resolve contextType once — used in both find and create paths
    const resolvedContextType: ConversationContextType =
      (contextType as ConversationContextType) ?? (productId ? ConversationContextType.PRODUCT_BASED : ConversationContextType.VENDOR_BASED)

    return withSerializableRetry(() =>
      prisma.$transaction(async (tx) => {
      // Try to find existing conversation with both participants.
      // Filter by contextType AND productId (explicit null for VENDOR_BASED) so that
      // a VENDOR_BASED conversation never merges with a PRODUCT_BASED one, and
      // two different products each get their own separate conversation.
      // Running inside a SERIALIZABLE transaction prevents a race condition
      // where two concurrent requests both see no conversation and both insert.
      const existing = await tx.conversation.findFirst({
        where: {
          type: type ?? ConversationType.DIRECT,
          contextType: resolvedContextType,
          productId: productId ?? null,
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
          contextType: resolvedContextType,
          ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonObject } : {}),
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
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
  )
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
   * Returns the total unread message count for a user across all non-hidden conversations.
   */
  async totalUnreadCount(userId: string): Promise<number> {
    const result = await prisma.conversationParticipant.aggregate({
      where: {
        userId,
        conversation: { hides: { none: { userId } } },
      },
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
