import { Server as SocketServer, Socket } from "socket.io"
import { decodeToken, resolveIdentity } from "../middleware/auth"
import { MessageService } from "../services/message.service"
import { ConversationService } from "../services/conversation.service"
import { NotificationService } from "../services/notification.service"
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
    try {
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
    } catch (err) {
      console.error("[socket] join_conversation error", err)
      socket.emit("error", { event: "join_conversation", message: "Internal server error" })
    }
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
    }) => {
      try {
        const { conversationId, content } = payload

        if (!content || !conversationId) return

        if (typeof content !== "string" || content.trim().length > 10_000) {
          socket.emit("error", { event: "send_message", message: "Message too long (max 10,000 characters)" })
          return
        }

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
          messageType: "TEXT",  // IMAGE messages must go through /api/upload REST endpoint
        })

        // Broadcast to all participants in the room
        io.to(`conversation:${conversationId}`).emit("message_received", message)

        // Notify participants who are not in the room (offline/background)
        await NotificationService.notifyAbsentParticipants(io, conversationId, userId, content.slice(0, 60))

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
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      })
      if (!participant) {
        socket.emit("error", { event: "messages_read", message: "Forbidden" })
        return
      }
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
        if (users.size === 0) typingUsers.delete(convId)
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
    if (users.size === 0) typingUsers.delete(conversationId)
    io.to(`conversation:${conversationId}`).emit("typing_update", {
      conversationId,
      typingUserIds: [...users],
    })
  }
}
