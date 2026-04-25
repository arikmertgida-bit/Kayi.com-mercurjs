import { Router } from "express"
import { Server as SocketServer } from "socket.io"
import multer from "multer"
import { v4 as uuidv4 } from "uuid"
import { authMiddleware, AuthRequest, resolveIdentity } from "../middleware/auth"
import { minioClient, BUCKET, objectUrl } from "../lib/minio"
import { MessageService } from "../services/message.service"
import { NotificationService } from "../services/notification.service"
import prisma from "../lib/prisma"

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
    upload.single("file"),
    async (req: AuthRequest, res) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded" })
          return
        }

        const { userId, userType } = resolveIdentity(req.auth!)
        const { conversationId } = req.body

        if (!conversationId) {
          res.status(400).json({ error: "conversationId is required" })
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

        const ext = req.file.originalname.split(".").pop() ?? "jpg"
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
              preview: "📷 Fotoğraf",
            })
          }
        }

        res.status(201).json({ message, imageUrl })
      } catch (err) {
        console.error("[upload] POST /", err)
        res.status(500).json({ error: "Internal server error" })
      }
    }
  )

  return router
}
