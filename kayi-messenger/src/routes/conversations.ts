import { Router } from "express"
import { authMiddleware, AuthRequest, resolveIdentity } from "../middleware/auth"
import { ConversationService } from "../services/conversation.service"
import { userNameCache } from "../lib/user-cache"
import { UserType, ConversationType } from "@prisma/client"
import prisma from "../lib/prisma"

const router = Router()

/**
 * POST /api/conversations
 * Find or create a direct conversation between the authenticated user and another participant.
 */
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, userType } = resolveIdentity(req.auth!)
    const { targetUserId, targetUserType, subject, productId, orderId } = req.body

    if (!targetUserId || !targetUserType) {
      res.status(400).json({ error: "targetUserId and targetUserType are required" })
      return
    }

    const conversation = await ConversationService.findOrCreate({
      participantAId: userId,
      participantAType: userType as UserType,
      participantBId: targetUserId,
      participantBType: targetUserType as UserType,
      subject,
      productId,
      orderId,
      type: ConversationType.DIRECT,
    })

    res.json({ conversation })
  } catch (err) {
    console.error("[conversations] POST /", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * GET /api/conversations
 * List all conversations for the authenticated user.
 */
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = resolveIdentity(req.auth!)
    const conversations = await ConversationService.listForUser(userId)
    // Enrich each participant with a cached displayName
    const enriched = conversations.map((conv) => ({
      ...conv,
      participants: conv.participants.map((p) => ({
        ...p,
        displayName: userNameCache.get(p.userId) ?? null,
      })),
    }))
    res.json({ conversations: enriched })
  } catch (err) {
    console.error("[conversations] GET /", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * PATCH /api/conversations/:id/read
 * Mark all messages in a conversation as read for the current user.
 */
router.patch("/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = resolveIdentity(req.auth!)
    await ConversationService.markAsRead(req.params.id, userId)
    res.json({ success: true })
  } catch (err) {
    console.error("[conversations] PATCH /:id/read", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * GET /api/conversations/unread-count
 * Returns total unread message count for the authenticated user.
 */
router.get("/unread-count", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = resolveIdentity(req.auth!)
    const count = await ConversationService.totalUnreadCount(userId)
    res.json({ count })
  } catch (err) {
    console.error("[conversations] GET /unread-count", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ─── Response Time ──────────────────────────────────────────────────────────

/**
 * Turkish public holidays (fixed + approximate religious for 2025-2027).
 * Format: YYYY-MM-DD in Turkey local time (UTC+3).
 */
const TURKISH_HOLIDAYS = new Set([
  // 2025
  "2025-01-01",
  "2025-03-30", "2025-03-31", "2025-04-01", // Ramazan Bayramı
  "2025-04-23",
  "2025-05-01",
  "2025-05-19",
  "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", // Kurban Bayramı
  "2025-07-15",
  "2025-08-30",
  "2025-10-29",
  // 2026
  "2026-01-01",
  "2026-03-20", "2026-03-21", "2026-03-22", // Ramazan Bayramı
  "2026-04-23",
  "2026-05-01",
  "2026-05-19",
  "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", // Kurban Bayramı
  "2026-07-15",
  "2026-08-30",
  "2026-10-29",
  // 2027
  "2027-01-01",
  "2027-03-10", "2027-03-11", "2027-03-12", // Ramazan Bayramı
  "2027-04-23",
  "2027-05-01",
  "2027-05-19",
  "2027-05-17", "2027-05-18", "2027-05-19", "2027-05-20", // Kurban Bayramı
  "2027-07-15",
  "2027-08-30",
  "2027-10-29",
])

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000 // UTC+3
const WORK_START_MIN = 8 * 60  // 08:00 = 480 min from midnight
const WORK_END_MIN = 17 * 60   // 17:00 = 1020 min from midnight

function toTurkeyDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + TURKEY_OFFSET_MS)
}

function turkeyDateKey(turkeyDate: Date): string {
  return turkeyDate.toISOString().slice(0, 10)
}

function isWorkingDay(utcDate: Date): boolean {
  const turkey = toTurkeyDate(utcDate)
  const day = turkey.getUTCDay() // 0=Sunday
  if (day === 0) return false // Sunday off
  if (TURKISH_HOLIDAYS.has(turkeyDateKey(turkey))) return false
  return true // Mon-Sat, not holiday
}

/** Minutes elapsed since midnight (Turkey time) */
function minuteOfDay(utcDate: Date): number {
  const turkey = toTurkeyDate(utcDate)
  return turkey.getUTCHours() * 60 + turkey.getUTCMinutes()
}

/**
 * Calculates "effective working minutes" between two UTC timestamps.
 * Only counts Mon-Sat 08:00-17:00 Turkey time, excluding holidays.
 */
function effectiveWorkingMinutes(startUtc: Date, endUtc: Date): number {
  if (endUtc <= startUtc) return 0

  let effective = 0
  // Walk day-by-day for efficiency
  const msPerDay = 24 * 60 * 60 * 1000
  const workDayMinutes = WORK_END_MIN - WORK_START_MIN // 540 min per working day

  // Midnight (Turkey time) of the start day
  const startTurkey = toTurkeyDate(startUtc)
  // Set to midnight of that day in Turkey time
  const startMidnightTurkey = new Date(
    Date.UTC(
      startTurkey.getUTCFullYear(),
      startTurkey.getUTCMonth(),
      startTurkey.getUTCDate(),
      0, 0, 0, 0
    )
  )
  // Convert back to UTC midnight of Turkey day
  const startMidnightUtc = new Date(startMidnightTurkey.getTime() - TURKEY_OFFSET_MS)

  let dayStartUtc = startMidnightUtc

  while (dayStartUtc < endUtc) {
    const dayEndUtc = new Date(dayStartUtc.getTime() + msPerDay)

    if (isWorkingDay(new Date(dayStartUtc.getTime() + TURKEY_OFFSET_MS))) {
      // Clamp to [startUtc, endUtc] ∩ [workStart, workEnd] of this day
      const workStartUtc = new Date(dayStartUtc.getTime() + WORK_START_MIN * 60 * 1000)
      const workEndUtc = new Date(dayStartUtc.getTime() + WORK_END_MIN * 60 * 1000)

      const windowStart = new Date(Math.max(startUtc.getTime(), workStartUtc.getTime()))
      const windowEnd = new Date(Math.min(endUtc.getTime(), workEndUtc.getTime()))

      if (windowEnd > windowStart) {
        effective += Math.round((windowEnd.getTime() - windowStart.getTime()) / (60 * 1000))
      }
    }

    dayStartUtc = dayEndUtc
  }

  return effective
}

/** Returns true if right now is within working hours (Turkey time, Mon-Sat 08:00-17:00) */
function isCurrentlyWithinWorkingHours(): boolean {
  const now = new Date()
  if (!isWorkingDay(now)) return false
  const mod = minuteOfDay(now)
  return mod >= WORK_START_MIN && mod < WORK_END_MIN
}

/**
 * GET /api/conversations/seller/:sellerId/response-time
 * Returns the average response time of a seller based on their last replies.
 * No authentication required (public info for storefront).
 */
router.get("/seller/:sellerId/response-time", async (req, res) => {
  try {
    const { sellerId } = req.params

    // Get conversations where seller is a participant
    const sellerConversations = await prisma.conversationParticipant.findMany({
      where: { userId: sellerId },
      select: { conversationId: true },
    })

    const conversationIds = sellerConversations.map((p) => p.conversationId)

    if (conversationIds.length === 0) {
      res.json({ avgMinutes: null, isWithinHours: isCurrentlyWithinWorkingHours() })
      return
    }

    // Get messages from these conversations, ordered by time
    const messages = await prisma.message.findMany({
      where: { conversationId: { in: conversationIds } },
      orderBy: { createdAt: "asc" },
      select: { id: true, conversationId: true, senderId: true, createdAt: true },
    })

    // Group messages by conversation
    const byConversation = new Map<string, typeof messages>()
    for (const msg of messages) {
      if (!byConversation.has(msg.conversationId)) {
        byConversation.set(msg.conversationId, [])
      }
      byConversation.get(msg.conversationId)!.push(msg)
    }

    const responseTimes: number[] = []

    for (const [, convMessages] of byConversation) {
      // Find pairs: customer message → first seller reply after it
      for (let i = 0; i < convMessages.length; i++) {
        const msg = convMessages[i]
        if (msg.senderId === sellerId) continue // skip seller's own messages

        // Find the first seller reply after this customer message
        const sellerReply = convMessages.slice(i + 1).find((m) => m.senderId === sellerId)
        if (!sellerReply) continue

        const responseMin = effectiveWorkingMinutes(msg.createdAt, sellerReply.createdAt)
        // Only count if it's a meaningful response (< 7 working days = 3780 min)
        if (responseMin > 0 && responseMin < 3780) {
          responseTimes.push(responseMin)
        }
      }
    }

    if (responseTimes.length === 0) {
      res.json({ avgMinutes: null, isWithinHours: isCurrentlyWithinWorkingHours() })
      return
    }

    // Take last 10 response times and average
    const recent = responseTimes.slice(-10)
    const avg = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)

    res.json({ avgMinutes: avg, isWithinHours: isCurrentlyWithinWorkingHours() })
  } catch (err) {
    console.error("[conversations] GET /seller/:sellerId/response-time", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
