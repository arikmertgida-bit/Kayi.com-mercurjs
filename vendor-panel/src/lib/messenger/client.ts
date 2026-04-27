import type { Conversation, Message } from "./types"

// Vite exposes env vars via import.meta.env
const BASE_URL: string =
  (import.meta as any).env?.VITE_MESSENGER_URL ?? "http://localhost:4000"

function getAuthHeader(): Record<string, string> {
  const token = window.localStorage.getItem("medusa_auth_token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: "include",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  return request("/api/conversations")
}

export async function findOrCreateConversation(payload: {
  targetUserId: string
  targetUserType: string
  type?: "DIRECT" | "ADMIN_SUPPORT"
  subject?: string
  productId?: string
  orderId?: string
  contextType?: string
}): Promise<{ conversation: Conversation }> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}/read`, { method: "PATCH" })
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request("/api/conversations/unread-count")
}

// ── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  cursor?: string
): Promise<{ messages: Message[] }> {
  const params = cursor ? `?cursor=${cursor}` : ""
  return request(`/api/conversations/${conversationId}/messages${params}`)
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ message: Message }> {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

// ── Image Upload ───────────────────────────────────────────────────────────

export async function uploadImage(
  conversationId: string,
  file: File
): Promise<{ message: Message; imageUrl: string }> {
  const formData = new FormData()
  formData.append("conversationId", conversationId)
  formData.append("file", file)

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: getAuthHeader(),
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

// ── Message Deletion ───────────────────────────────────────────────

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  deleteForAll: boolean
): Promise<void> {
  await request(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
    body: JSON.stringify({ deleteForAll }),
  })
}

export async function deleteConversation(
  conversationId: string,
  deleteForAll: boolean
): Promise<void> {
  await request(`/api/conversations/${conversationId}`, {
    method: "DELETE",
    body: JSON.stringify({ deleteForAll }),
  })
}
