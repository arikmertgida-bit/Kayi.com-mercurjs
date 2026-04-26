import { io, Socket } from "socket.io-client"

const BASE_URL: string =
  (import.meta as any).env?.VITE_MESSENGER_URL ?? "http://localhost:4000"

let socketInstance: Socket | null = null

function getToken(): string | null {
  return window.localStorage.getItem("medusa_auth_token")
}

export function getSocket(): Socket | null {
  return socketInstance
}

export function connectSocket(displayName?: string | null): Socket {
  if (socketInstance?.connected) return socketInstance

  const token = getToken()

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

  socketInstance.on("disconnect", (reason: string) => {
    console.log("[messenger] Disconnected:", reason)
  })

  socketInstance.on("connect_error", (err: Error) => {
    console.error("[messenger] Connection error:", err.message)
  })

  return socketInstance
}

export function disconnectSocket(): void {
  socketInstance?.disconnect()
  socketInstance = null
}

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

export function emitDeleteMessage(
  messageId: string,
  conversationId: string,
  deleteForAll: boolean
): void {
  socketInstance?.emit("delete_message", { messageId, conversationId, deleteForAll })
}
