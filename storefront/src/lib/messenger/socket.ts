"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import type {
  Message,
  NotificationPayload,
  ReadReceiptPayload,
  TypingUpdatePayload,
} from "./types"

const BASE_URL =
  process.env.NEXT_PUBLIC_MESSENGER_URL || "http://localhost:4000"

let socketInstance: Socket | null = null

function getToken(): string | null {
  return (
    window.localStorage.getItem("_medusa_jwt") ||
    window.localStorage.getItem("medusa_auth_token")
  )
}

export function getSocket(): Socket | null {
  return socketInstance
}

export function connectSocket(tokenOverride?: string | null, displayName?: string | null): Socket {
  if (socketInstance?.connected) return socketInstance

  const token = tokenOverride ?? getToken()

  socketInstance = io(BASE_URL, {
    auth: { token, displayName: displayName ?? undefined },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socketInstance.on("connect", () => {
    console.log("[messenger] Connected to socket server")
  })

  socketInstance.on("disconnect", (reason) => {
    console.log("[messenger] Disconnected:", reason)
  })

  socketInstance.on("connect_error", (err) => {
    console.error("[messenger] Connection error:", err.message)
  })

  return socketInstance
}

export function disconnectSocket(): void {
  socketInstance?.disconnect()
  socketInstance = null
}

// ── Event Hooks ────────────────────────────────────────────────────────────

export interface UseSocketEventsOptions {
  onMessage?: (message: Message) => void
  onTypingUpdate?: (payload: TypingUpdatePayload) => void
  onReadReceipt?: (payload: ReadReceiptPayload) => void
  onNotification?: (payload: NotificationPayload) => void
}

/**
 * Subscribes to socket events. Pass stable callbacks (memoised with useCallback).
 * Returns the socket instance.
 */
export function useSocketEvents(options: UseSocketEventsOptions): Socket | null {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = connectSocket()
    socketRef.current = socket

    if (options.onMessage) {
      socket.on("message_received", options.onMessage)
    }
    if (options.onTypingUpdate) {
      socket.on("typing_update", options.onTypingUpdate)
    }
    if (options.onReadReceipt) {
      socket.on("read_receipt", options.onReadReceipt)
    }
    if (options.onNotification) {
      socket.on("notification", options.onNotification)
    }

    return () => {
      if (options.onMessage) socket.off("message_received", options.onMessage)
      if (options.onTypingUpdate) socket.off("typing_update", options.onTypingUpdate)
      if (options.onReadReceipt) socket.off("read_receipt", options.onReadReceipt)
      if (options.onNotification) socket.off("notification", options.onNotification)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return socketRef.current
}

// ── Emitters ───────────────────────────────────────────────────────────────

export function joinConversation(conversationId: string): void {
  socketInstance?.emit("join_conversation", conversationId)
}

export function leaveConversation(conversationId: string): void {
  socketInstance?.emit("leave_conversation", conversationId)
}

export function emitTypingStart(conversationId: string): void {
  socketInstance?.emit("typing_start", conversationId)
}

export function emitTypingStop(conversationId: string): void {
  socketInstance?.emit("typing_stop", conversationId)
}

export function emitMessagesRead(conversationId: string): void {
  socketInstance?.emit("messages_read", conversationId)
}
