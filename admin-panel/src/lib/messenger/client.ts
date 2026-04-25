import type { Conversation, Message } from "./types"

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

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  return request("/api/conversations")
}

export async function getMessages(conversationId: string): Promise<{ messages: Message[] }> {
  return request(`/api/conversations/${conversationId}/messages`)
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

export async function markConversationRead(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}/read`, { method: "PATCH" })
}

export async function findOrCreateConversation(payload: {
  targetUserId: string
  targetUserType: string
  subject?: string
}): Promise<{ conversation: Conversation }> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
