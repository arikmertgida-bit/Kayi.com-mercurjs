import { Server as SocketServer, Socket } from "socket.io"
import { decodeToken, resolveIdentity } from "../middleware/auth"
import { MessageService } from "../services/message.service"
import { ConversationService } from "../services/conversation.service"
import { NotificationService } from "../services/notification.service"
import { resolveDisplayName } from "../lib/user-cache"
import prisma from "../lib/prisma"

/** Map of conversationId → Set of typing userIds */
const typingUsers = new Map<string, Set<string>>()

export function registerSocketHandlers(io: SocketServer, socket: Socket): void {
  const { userId, userType } = socket.data as { userId: string; userType: string }

  // Join a personal room for notifications
  socket.join(`user:${userId}`)

  console.log(`[socket] Connected: ${userId} (${userType}) — socket ${socket.id}`)

  // ── Join Conversation ──────────────────────────────────────────────────────
  socket.on("join_conversation", async (conversationId: string) => {
    // Verify participation before joining room
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })

    if (!participant) {
      socket.emit("error", { event: "join_conversation", message: "Forbidden" })
      return
    }

    socket.join(`conversation:${conversationId}`)
    socket.emit("joined_conversation", { conversationId })
  })

  // ── Leave Conversation ─────────────────────────────────────────────────────
  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
    _clearTyping(io, conversationId, userId)
  })

  // ── Send Message ───────────────────────────────────────────────────────────
  socket.on(
    "send_message",
    async (payload: {
      conversationId: string
      content: string
      messageType?: "TEXT" | "IMAGE"
      imageUrl?: string
    }) => {
      try {
        const { conversationId, content, messageType, imageUrl } = payload

        if (!content || !conversationId) return

        // Verify participation
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        })

        if (!participant) {
          socket.emit("error", { event: "send_message", message: "Forbidden" })
          return
        }

        const message = await MessageService.create({
          conversationId,
          senderId: userId,
          senderType: userType as any,
          content,
          messageType: messageType ?? "TEXT",
          imageUrl,
        })

        // Broadcast to all participants in the room
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
            const senderName = await resolveDisplayName(userId)
            NotificationService.notifyUser(io, other.userId, {
              type: "new_message",
              conversationId,
              senderName,
              preview: messageType === "IMAGE" ? "📷 Fotoğraf" : content.slice(0, 60),
            })
          }
        }

        // Stop typing indicator when message is sent
        _clearTyping(io, conversationId, userId)
      } catch (err) {
        console.error("[socket] send_message error", err)
      }
    }
  )

  // ── Typing Indicators ──────────────────────────────────────────────────────
  socket.on("typing_start", (conversationId: string) => {
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set())
    }
    typingUsers.get(conversationId)!.add(userId)
    socket.to(`conversation:${conversationId}`).emit("typing_update", {
      conversationId,
      typingUserIds: [...typingUsers.get(conversationId)!],
    })
  })

  socket.on("typing_stop", (conversationId: string) => {
    _clearTyping(io, conversationId, userId)
  })

  // ── Read Receipt ───────────────────────────────────────────────────────────
  socket.on("messages_read", async (conversationId: string) => {
    try {
      await ConversationService.markAsRead(conversationId, userId)
      io.to(`conversation:${conversationId}`).emit("read_receipt", {
        conversationId,
        userId,
        readAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error("[socket] messages_read error", err)
    }
  })

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[socket] Disconnected: ${userId} — socket ${socket.id}`)
    // Clean up all typing indicators for this user
    for (const [convId, users] of typingUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId)
        io.to(`conversation:${convId}`).emit("typing_update", {
          conversationId: convId,
          typingUserIds: [...users],
        })
      }
    }
  })
}

function _clearTyping(io: SocketServer, conversationId: string, userId: string): void {
  const users = typingUsers.get(conversationId)
  if (users?.has(userId)) {
    users.delete(userId)
    io.to(`conversation:${conversationId}`).emit("typing_update", {
      conversationId,
      typingUserIds: [...users],
    })
  }
}
