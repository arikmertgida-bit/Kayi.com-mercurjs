/**
 * Server-to-server helper for notifying kayi-messenger from the backend.
 * Uses an internal secret key — never exposed to the frontend.
 */

const MESSENGER_URL =
  process.env.MESSENGER_INTERNAL_URL || "http://kayi-messenger:4000"

const INTERNAL_SECRET =
  process.env.MESSENGER_INTERNAL_SECRET || "kayi-internal-secret"

interface NotifyParams {
  /** User id to deliver the notification to */
  targetUserId: string
  /** Medusa actor type for the target */
  targetUserType: "CUSTOMER" | "SELLER" | "ADMIN"
  /** Display name shown in the browser notification */
  senderName?: string
  /** Short notification text */
  preview: string
  /** If provided, also persists a system message in this conversation */
  conversationId?: string
  /** Used to auto-find/create a conversation when conversationId is omitted */
  sourceUserId?: string
  sourceUserType?: "CUSTOMER" | "SELLER" | "ADMIN"
  subject?: string
}

/**
 * Sends a real-time notification to a user via kayi-messenger.
 * Failures are caught and logged — never throws, so it won't break the API response.
 */
export async function notifyMessengerUser(params: NotifyParams): Promise<void> {
  try {
    const response = await fetch(`${MESSENGER_URL}/api/internal/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000), // 3s timeout — non-blocking
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.warn(`[messenger] notify failed (${response.status}): ${text}`)
    }
  } catch (err) {
    // Network error or kayi-messenger down — non-critical
    console.warn("[messenger] notify error:", (err as Error).message)
  }
}
