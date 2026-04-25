import type { Conversation, Message } from "./types"

const BASE_URL =
  process.env.NEXT_PUBLIC_MESSENGER_URL || "http://localhost:4000"

/** Module-level token — set by MessengerProvider when the server-side token is available */
let _messengerAuthToken: string | null = null

export function setMessengerAuthToken(token: string | null): void {
  _messengerAuthToken = token
}

function getAuthHeader(): Record<string, string> {
  // Prefer the server-provided token (passed from layout via MessengerProvider)
  const token =
    _messengerAuthToken ??
    (typeof window !== "undefined"
      ? window.localStorage.getItem("_medusa_jwt") ||
        window.localStorage.getItem("medusa_auth_token")
      : null)

  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
  subject?: string
  productId?: string
  orderId?: string
}): Promise<{ conversation: Conversation }> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function markConversationRead(
  conversationId: string
): Promise<void> {
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

  const headers = getAuthHeader()

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}
