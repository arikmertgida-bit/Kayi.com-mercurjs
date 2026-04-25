import { Router, Request, Response } from "express"
import { Server as SocketServer } from "socket.io"
import { ConversationService } from "../services/conversation.service"
import { NotificationService } from "../services/notification.service"

const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET || "kayi-internal-secret"

/**
 * Creates the internal server-to-server router.
 * These endpoints are NOT exposed to the public internet.
 * Protected by the x-internal-secret header.
 */
export function createInternalRouter(io: SocketServer): Router {
  const router = Router()

  // Middleware — verify internal secret
  router.use((req: Request, res: Response, next) => {
    const secret = req.headers["x-internal-secret"]
    if (secret !== INTERNAL_SECRET) {
      res.status(401).json({ message: "Unauthorized" })
      return
    }
    next()
  })

  /**
   * POST /api/internal/notify
   *
   * Emits a real-time notification to a specific user's socket room.
   * Optionally creates a NOTIFICATION-type system message in a conversation.
   *
   * Body:
   *   targetUserId   — recipient's user id
   *   targetUserType — "CUSTOMER" | "SELLER" | "ADMIN"
   *   senderName     — display name shown in the notification
   *   preview        — notification text (e.g. "Yeni bir yorum aldınız")
   *   conversationId — (optional) if provided, also persists a system message
   *   sourceUserId   — (optional) used to find/create a conversation if conversationId omitted
   *   sourceUserType — (optional) "CUSTOMER" | "SELLER" | "ADMIN"
   *   subject        — (optional) conversation subject when auto-creating
   */
  router.post("/notify", async (req: Request, res: Response) => {
    const {
      targetUserId,
      targetUserType,
      senderName,
      preview,
      conversationId,
      sourceUserId,
      sourceUserType,
      subject,
    } = req.body as {
      targetUserId: string
      targetUserType: string
      senderName?: string
      preview: string
      conversationId?: string
      sourceUserId?: string
      sourceUserType?: string
      subject?: string
    }

    if (!targetUserId || !preview) {
      res.status(400).json({ message: "targetUserId and preview are required" })
      return
    }

    // Always emit real-time notification to user room
    NotificationService.notifyUser(io, targetUserId, {
      type: "review_notification",
      senderName: senderName ?? "Kayı",
      preview,
      conversationId,
    })

    // Optionally persist a system message in a conversation
    if (conversationId) {
      try {
        await NotificationService.sendSystemMessage(
          io,
          conversationId,
          "system",
          preview
        )
      } catch (err) {
        // Non-critical — notification already sent via socket
        console.warn("[internal/notify] Could not create system message:", err)
      }
    } else if (sourceUserId && targetUserId) {
      // Auto-find or create a conversation and post the system message
      try {
        const conv = await ConversationService.findOrCreate({
          participantAId: sourceUserId,
          participantAType: (sourceUserType as any) ?? "CUSTOMER",
          participantBId: targetUserId,
          participantBType: (targetUserType as any) ?? "SELLER",
          subject: subject ?? preview.substring(0, 60),
        })
        await NotificationService.sendSystemMessage(
          io,
          conv.id,
          "system",
          preview
        )
      } catch (err) {
        console.warn("[internal/notify] Could not auto-create conversation:", err)
      }
    }

    res.json({ sent: true })
  })

  return router
}
