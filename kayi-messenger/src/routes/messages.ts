import { Router } from "express"
import { Server as SocketServer } from "socket.io"
import { authMiddleware, AuthRequest, resolveIdentity } from "../middleware/auth"
import { MessageService } from "../services/message.service"
import { NotificationService } from "../services/notification.service"
import prisma from "../lib/prisma"

export function createMessageRouter(io: SocketServer) {
  const router = Router()

  /**
   * GET /api/conversations/:id/messages
   * Returns paginated messages for a conversation.
   * Requires the user to be a participant.
   */
  router.get("/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId } = resolveIdentity(req.auth!)
      const { id: conversationId } = req.params
      const cursor = req.query.cursor as string | undefined
      const limit = Math.min(parseInt(req.query.limit as string || "30", 10), 100)

      // Verify participation
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      })

      if (!participant) {
        res.status(403).json({ error: "Not a participant of this conversation" })
        return
      }

      const messages = await MessageService.list(conversationId, cursor, limit)
      res.json({ messages })
    } catch (err) {
      console.error("[messages] GET /:id/messages", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  /**
   * POST /api/conversations/:id/messages
   * Send a text message. Image messages go through /api/upload instead.
   */
  router.post("/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId, userType } = resolveIdentity(req.auth!)
      const { id: conversationId } = req.params
      const { content } = req.body

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        res.status(400).json({ error: "content is required" })
        return
      }

      // Verify participation
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      })

      if (!participant) {
        res.status(403).json({ error: "Not a participant of this conversation" })
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
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      })

      const otherParticipants =
        conversation?.participants.filter((p) => p.userId !== userId) ?? []

      for (const other of otherParticipants) {
        const roomSockets = await io.in(`conversation:${conversationId}`).fetchSockets()
        const otherInRoom = roomSockets.some((s) => s.data.userId === other.userId)

        if (!otherInRoom) {
          NotificationService.notifyUser(io, other.userId, {
            type: "new_message",
            conversationId,
            senderName: userId,
            preview: content.trim().slice(0, 60),
          })
        }
      }

      res.status(201).json({ message })
    } catch (err) {
      console.error("[messages] POST /:id/messages", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  return router
}
