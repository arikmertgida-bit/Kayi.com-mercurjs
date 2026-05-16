import { Server as SocketServer } from "socket.io"
import { MessageType } from "@prisma/client"
import { MessageService } from "../services/message.service"
import { resolveDisplayName } from "../lib/user-cache"
import { redisRoomMembers } from "../lib/redis"
import prisma from "../lib/prisma"

/**
 * Sends a push notification payload via Socket.io to a specific user room.
 * The client-side MessengerProvider handles translating this into a
 * browser Notification when the tab is hidden.
 */
export const NotificationService = {
  notifyUser(
    io: SocketServer,
    targetUserId: string,
    payload: {
      type: string
      conversationId?: string
      senderName: string
      preview: string
    }
  ) {
    io.to(`user:${targetUserId}`).emit("notification", payload)
  },

  /**
   * Notifies all participants of a conversation who are NOT currently in the room.
   * Uses Redis SET (room:active:{conversationId}) for O(1) presence checks instead
   * of io.fetchSockets() which performs a distributed query across all pods.
   */
  async notifyAbsentParticipants(
    io: SocketServer,
    conversationId: string,
    senderId: string,
    preview: string
  ): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    })

    const otherParticipants =
      conversation?.participants.filter((p) => p.userId !== senderId) ?? []

    if (otherParticipants.length === 0) return

    // Redis SMEMBERS is O(N) where N = active users in room (bounded, typically < 10).
    // Vastly faster than io.fetchSockets() which performs a distributed query across all pods.
    // Run both in parallel since they are independent.
    const [activeInRoom, senderName] = await Promise.all([
      redisRoomMembers(conversationId),
      resolveDisplayName(senderId),
    ])

    for (const other of otherParticipants) {
      if (!activeInRoom.has(other.userId)) {
        NotificationService.notifyUser(io, other.userId, {
          type: "new_message",
          conversationId,
          senderName,
          preview,
        })
      }
    }
  },

  /**
   * Sends a system notification message into a conversation.
   * Used for review events (e.g., "Yeni yorum aldınız").
   * Optional `options.messageType` overrides the default NOTIFICATION type.
   * Optional `options.metadata` attaches structured data (e.g. promotion payload).
   */
  async sendSystemMessage(
    io: SocketServer,
    conversationId: string,
    senderId: string,
    content: string,
    options?: {
      messageType?: MessageType
      metadata?: Record<string, unknown>
    }
  ) {
    const message = await MessageService.create({
      conversationId,
      senderId,
      senderType: "ADMIN",
      content,
      messageType: options?.messageType ?? "NOTIFICATION",
      ...(options?.metadata !== undefined ? { metadata: options.metadata } : {}),
    })

    io.to(`conversation:${conversationId}`).emit("message_received", message)
    return message
  },
}
