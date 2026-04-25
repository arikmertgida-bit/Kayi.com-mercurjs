import { Server as SocketServer } from "socket.io"
import { MessageService } from "../services/message.service"

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
      type: "new_message" | "review_notification"
      conversationId?: string
      senderName: string
      preview: string
    }
  ) {
    io.to(`user:${targetUserId}`).emit("notification", payload)
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
