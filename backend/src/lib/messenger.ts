/**
 * Server-to-server helper for notifying kayi-messenger from the backend.
 * Uses an internal secret key — never exposed to the frontend.
 */

const MESSENGER_URL =
  process.env.MESSENGER_INTERNAL_URL || "http://kayi-messenger:4000"

if (!process.env.MESSENGER_INTERNAL_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[messenger] MESSENGER_INTERNAL_SECRET env variable must be set in production")
  }
  console.warn("[messenger] WARNING: MESSENGER_INTERNAL_SECRET is not set — using insecure default. Set it in your .env file.")
}

const INTERNAL_SECRET =
  process.env.MESSENGER_INTERNAL_SECRET ?? "kayi-internal-secret"

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
  /** Conversation type when auto-creating: DIRECT (default) or ADMIN_SUPPORT (one-way) */
  conversationType?: "DIRECT" | "ADMIN_SUPPORT"
  /** Notification type emitted to the client socket (e.g. "review_notification", "new_message") */
  notificationType?: string
  /** Message type to persist (default: NOTIFICATION). Use PROMOTION for promotion broadcasts. */
  messageType?: "TEXT" | "IMAGE" | "NOTIFICATION" | "PROMOTION"
  /** Structured payload attached to the persisted message (e.g. promotion card data). */
  metadata?: Record<string, unknown>
}

/**
 * Deletes all PROMOTION-type messages linked to the given promotionId.
 * Optionally also matches by promotionCode for legacy messages.
 * Called when a promotion is deleted so users no longer see expired/invalid promotions.
 * Failures are caught and logged — never throws.
 */
export async function deletePromotionMessages(promotionId: string, promotionCode?: string): Promise<void> {
  try {
    const body: Record<string, string> = { promotion_id: promotionId }
    if (promotionCode) body.promotion_code = promotionCode

    const response = await fetch(
      `${MESSENGER_URL}/api/internal/delete-promotion-messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.warn(`[messenger] delete-promotion-messages failed (${response.status}): ${text}`)
    }
  } catch (err) {
    console.warn("[messenger] delete-promotion-messages error:", (err as Error).message)
  }
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
