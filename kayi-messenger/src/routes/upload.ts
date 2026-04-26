import { Router } from "express"
import rateLimit from "express-rate-limit"
import { Server as SocketServer } from "socket.io"
import multer from "multer"
import { v4 as uuidv4 } from "uuid"
import { authMiddleware, AuthRequest, resolveIdentity } from "../middleware/auth"
import { requireConversationParticipant } from "../middleware/conversation-participant"
import { minioClient, BUCKET, objectUrl } from "../lib/minio"
import { MessageService } from "../services/message.service"
import { NotificationService } from "../services/notification.service"

// 10 uploads per minute per authenticated user
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).auth?.sub ?? req.ip ?? "unknown",
  message: { error: "Too many uploads. Please slow down." },
})

// Store file in memory; stream to MinIO
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

export function createUploadRouter(io: SocketServer) {
  const router = Router()

  /**
   * POST /api/upload
   * Uploads an image to MinIO and creates a MESSAGE record with messageType=IMAGE.
   * Form fields: conversationId, file (multipart)
   */
  router.post(
    "/",
    authMiddleware,
    uploadLimiter,
    upload.single("file"),
    requireConversationParticipant,
    async (req: AuthRequest, res) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded" })
          return
        }

        const { userId, userType } = resolveIdentity(req.auth!)
        const conversationId = (req as any).conversationId as string

        // Derive extension from MIME type, never from user-controlled filename
        const MIME_TO_EXT: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        }
        const ext = MIME_TO_EXT[req.file.mimetype] ?? "jpg"
        const key = `messenger/${conversationId}/${uuidv4()}.${ext}`

        await minioClient.putObject(BUCKET, key, req.file.buffer, req.file.size, {
          "Content-Type": req.file.mimetype,
        })

        const imageUrl = objectUrl(key)

        const message = await MessageService.create({
          conversationId,
          senderId: userId,
          senderType: userType,
          content: "[image]",
          messageType: "IMAGE",
          imageUrl,
        })

        // Broadcast to all participants in the conversation room
        io.to(`conversation:${conversationId}`).emit("message_received", message)

        // Notify participants who are not in the room (offline/background)
        await NotificationService.notifyAbsentParticipants(io, conversationId, userId, "📷 Fotoğraf")

        res.status(201).json({ message, imageUrl })
      } catch (err) {
        console.error("[upload] POST /", err)
        res.status(500).json({ error: "Internal server error" })
      }
    }
  )

  return router
}
