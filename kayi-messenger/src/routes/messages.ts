import { Router } from "express"
import rateLimit from "express-rate-limit"
import { Server as SocketServer } from "socket.io"
import { authMiddleware, AuthRequest, resolveIdentity } from "../middleware/auth"
import { requireConversationParticipant } from "../middleware/conversation-participant"
import { MessageService } from "../services/message.service"
import { NotificationService } from "../services/notification.service"

// 30 messages per minute per authenticated user
const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).auth?.sub ?? req.ip ?? "unknown",
  message: { error: "Too many messages. Please slow down." },
})

export function createMessageRouter(io: SocketServer) {
  const router = Router()

  /**
   * GET /api/conversations/:id/messages
   * Returns paginated messages for a conversation.
   * Requires the user to be a participant.
   */
  router.get("/:id/messages", authMiddleware, requireConversationParticipant, async (req: AuthRequest, res) => {
    try {
      const { userId } = resolveIdentity(req.auth!)
      const conversationId = (req as any).conversationId as string
      const cursor = req.query.cursor as string | undefined
      const limit = Math.min(parseInt(req.query.limit as string || "30", 10), 100)

      const messages = await MessageService.list(conversationId, userId, cursor, limit)
      res.json({ messages })
    } catch (err) {
      console.error("[messages] GET /:id/messages", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  /**
   * DELETE /api/conversations/:id/messages/:msgId
   * Delete a message. Body: { deleteForAll: boolean }
   */
  router.delete("/:id/messages/:msgId", authMiddleware, requireConversationParticipant, async (req: AuthRequest, res) => {
    try {
      const { userId } = resolveIdentity(req.auth!)
      const messageId = req.params.msgId
      const deleteForAll = Boolean(req.body?.deleteForAll)

      const message = await MessageService.deleteMessage(messageId, userId, deleteForAll)

      if (deleteForAll) {
        // Broadcast updated message to all participants in the room
        io.to(`conversation:${(req as any).conversationId}`).emit("message_deleted", {
          messageId,
          conversationId: (req as any).conversationId,
          deleteForAll: true,
          content: "[Bu mesaj silindi]",
        })
      }

      res.json({ message })
    } catch (err: any) {
      if (err.message === "Forbidden" || err.message === "Only the sender can delete for all") {
        res.status(403).json({ error: err.message })
        return
      }
      if (err.message === "Message not found") {
        res.status(404).json({ error: err.message })
        return
      }
      console.error("[messages] DELETE /:id/messages/:msgId", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  /**
   * POST /api/conversations/:id/messages
   * Send a text message. Image messages go through /api/upload instead.
   */
  router.post("/:id/messages", authMiddleware, messageSendLimiter, requireConversationParticipant, async (req: AuthRequest, res) => {
    try {
      const { userId, userType } = resolveIdentity(req.auth!)
      const conversationId = (req as any).conversationId as string
      const { content } = req.body

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        res.status(400).json({ error: "content is required" })
        return
      }

      if (content.trim().length > 10_000) {
        res.status(400).json({ error: "Message too long (max 10,000 characters)" })
        return
      }

      const message = await MessageService.create({
        conversationId,
        senderId: userId,
        senderType: userType,
        content: content.trim(),
        messageType: "TEXT",
      })

      // Broadcast to all participants in the conversation room
      io.to(`conversation:${conversationId}`).emit("message_received", message)

      // Notify participants who are not in the room (offline/background)
      await NotificationService.notifyAbsentParticipants(io, conversationId, userId, content.trim().slice(0, 60))

      res.status(201).json({ message })
    } catch (err) {
      console.error("[messages] POST /:id/messages", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  return router
}
