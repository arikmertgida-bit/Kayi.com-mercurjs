import { Router, Request, Response } from "express"
import { z } from "zod"
import { Server as SocketServer } from "socket.io"
import { ConversationService } from "../services/conversation.service"
import { NotificationService } from "../services/notification.service"

if (!process.env.MESSENGER_INTERNAL_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[messenger] MESSENGER_INTERNAL_SECRET env variable must be set in production")
  }
  console.warn("[messenger] WARNING: MESSENGER_INTERNAL_SECRET is not set — using insecure default. Set it in your .env file.")
}

const INTERNAL_SECRET =
  process.env.MESSENGER_INTERNAL_SECRET ?? "kayi-internal-secret"

const userTypeEnum = z.enum(["CUSTOMER", "SELLER", "ADMIN"])

const notifySchema = z.object({
  targetUserId: z.string().min(1, "targetUserId is required"),
  targetUserType: userTypeEnum,
  senderName: z.string().max(100).optional(),
  preview: z.string().min(1, "preview is required").max(200),
  conversationId: z.string().optional(),
  sourceUserId: z.string().optional(),
  sourceUserType: userTypeEnum.optional(),
  subject: z.string().max(255).optional(),
  conversationType: z.enum(["DIRECT", "ADMIN_SUPPORT"]).optional(),
  notificationType: z.string().min(1).max(100).optional(),
})

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
   *   preview        — notification text (e.g. "You have received a new review")
   *   conversationId — (optional) if provided, also persists a system message
   *   sourceUserId   — (optional) used to find/create a conversation if conversationId omitted
   *   sourceUserType — (optional) "CUSTOMER" | "SELLER" | "ADMIN"
   *   subject        — (optional) conversation subject when auto-creating
   */
  router.post("/notify", async (req: Request, res: Response) => {
    const parsed = notifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0].message })
      return
    }
    const {
      targetUserId,
      targetUserType,
      senderName,
      preview,
      conversationId,
      sourceUserId,
      sourceUserType,
      subject,
      conversationType,
      notificationType,
    } = parsed.data

    // Always emit real-time notification to user room
    NotificationService.notifyUser(io, targetUserId, {
      type: notificationType ?? "notification",
      senderName: senderName ?? "System",
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
          subject: subject ?? preview.substring(0, 60),          type: (conversationType as any) ?? undefined,        })
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
