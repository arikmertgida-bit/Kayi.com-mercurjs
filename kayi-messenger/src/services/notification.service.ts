import { Server as SocketServer } from "socket.io"
import { MessageService } from "../services/message.service"
import { resolveDisplayName } from "../lib/user-cache"
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
   * Used after a message is sent (text or image) to push offline/background notifications.
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

    const roomSockets = await io.in(`conversation:${conversationId}`).fetchSockets()
    const senderName = await resolveDisplayName(senderId)

    for (const other of otherParticipants) {
      const otherInRoom = roomSockets.some((s) => s.data.userId === other.userId)
      if (!otherInRoom) {
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
   */
  async sendSystemMessage(
    io: SocketServer,
    conversationId: string,
    senderId: string,
    content: string
  ) {
    const message = await MessageService.create({
      conversationId,
      senderId,
      senderType: "ADMIN",
      content,
      messageType: "NOTIFICATION",
    })

    io.to(`conversation:${conversationId}`).emit("message_received", message)
    return message
  },
}
