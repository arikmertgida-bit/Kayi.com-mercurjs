import { Server as SocketServer, Socket } from "socket.io"
import { UserType } from "@prisma/client"
import { decodeToken, resolveIdentity } from "../middleware/auth"
import { MessageService } from "../services/message.service"
import { ConversationService } from "../services/conversation.service"
import { NotificationService } from "../services/notification.service"
import {
  redisTypingSet,
  redisTypingClear,
  redisTypingGet,
  redisTypingClearAll,
  redisTypingTrackConv,
  redisRoomJoin,
  redisRoomLeave,
} from "../lib/redis"
import prisma from "../lib/prisma"

export function registerSocketHandlers(io: SocketServer, socket: Socket): void {
  const { userId, userType } = socket.data as { userId: string; userType: string }

  // Join a personal room for notifications
  socket.join(`user:${userId}`)

  console.info(`[socket] Connected: ${userId} (${userType}) — socket ${socket.id}`)

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
      // Track presence so notifyAbsentParticipants can check Redis instead of fetchSockets()
      await redisRoomJoin(conversationId, userId)
      socket.emit("joined_conversation", { conversationId })
    } catch (err) {
      console.error("[socket] join_conversation error", err)
      socket.emit("error", { event: "join_conversation", message: "Internal server error" })
    }
  })

  // ── Leave Conversation ─────────────────────────────────────────────────────
  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
    // Fire-and-forget — non-critical cleanup
    redisRoomLeave(conversationId, userId).catch(() => {})
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

        if (typeof content !== "string") {
          socket.emit("error", { event: "send_message", message: "Invalid message content" })
          return
        }

        const trimmed = content.trim()

        if (trimmed.length === 0) {
          socket.emit("error", { event: "send_message", message: "Message cannot be empty" })
          return
        }

        if (trimmed.length > 10_000) {
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
          senderType: userType as UserType,
          content: trimmed,
          messageType: "TEXT",  // IMAGE messages must go through /api/upload REST endpoint
        })

        // Broadcast to all participants in the room
        io.to(`conversation:${conversationId}`).emit("message_received", message)

        // Notify participants who are not in the room (offline/background)
        await NotificationService.notifyAbsentParticipants(io, conversationId, userId, trimmed.slice(0, 60))

        // Stop typing indicator when message is sent
        _clearTyping(io, conversationId, userId)
      } catch (err) {
        console.error("[socket] send_message error", err)
      }
    }
  )

  // ── Typing Indicators ──────────────────────────────────────────────────────
  socket.on("typing_start", async (conversationId: string) => {
    try {
      // Track and set in parallel — both are independent Redis writes
      await Promise.all([
        redisTypingTrackConv(conversationId, userId),
        redisTypingSet(conversationId, userId),
      ])
      const typingUserIds = await redisTypingGet(conversationId)
      socket.to(`conversation:${conversationId}`).emit("typing_update", {
        conversationId,
        typingUserIds,
      })
    } catch {
      // Non-critical — typing indicators are best-effort
    }
  })

  socket.on("typing_stop", (conversationId: string) => {
    _clearTyping(io, conversationId, userId)
  })

  // ── Delete Message ─────────────────────────────────────────────────────────
  socket.on(
    "delete_message",
    async (payload: { messageId: string; conversationId: string; deleteForAll: boolean }) => {
      try {
        const { messageId, conversationId, deleteForAll } = payload
        if (!messageId || !conversationId) return

        // Verify participation
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        })
        if (!participant) {
          socket.emit("error", { event: "delete_message", message: "Forbidden" })
          return
        }

        await MessageService.deleteMessage(messageId, userId, deleteForAll, userType)

        if (deleteForAll) {
          // Broadcast to all in room — message is hard-deleted
          io.to(`conversation:${conversationId}`).emit("message_deleted", {
            messageId,
            conversationId,
            deleteForAll: true,
          })
        } else {
          // Only notify the requester's own socket (delete for me)
          socket.emit("message_deleted", {
            messageId,
            conversationId,
            deleteForAll: false,
          })
        }
      } catch (err: unknown) {
        console.error("[socket] delete_message error", err)
        const message = err instanceof Error ? err.message : "Internal error"
        socket.emit("error", { event: "delete_message", message })
      }
    }
  )

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
    console.info(`[socket] Disconnected: ${userId} — socket ${socket.id}`)
    // Clean up typing indicators for this user across all tracked conversations
    redisTypingClearAll(userId)
      .then(async (conversationIds) => {
        for (const convId of conversationIds) {
          const typingUserIds = await redisTypingGet(convId)
          io.to(`conversation:${convId}`).emit("typing_update", {
            conversationId: convId,
            typingUserIds,
          })
        }
      })
      .catch(() => {})
  })
}

/**
 * Clears a user's typing indicator in a conversation and broadcasts the updated list.
 * Fire-and-forget — errors are swallowed since typing indicators are best-effort.
 */
function _clearTyping(io: SocketServer, conversationId: string, userId: string): void {
  redisTypingClear(conversationId, userId)
    .then(() => redisTypingGet(conversationId))
    .then((typingUserIds) => {
      io.to(`conversation:${conversationId}`).emit("typing_update", {
        conversationId,
        typingUserIds,
      })
    })
    .catch(() => {})
}
