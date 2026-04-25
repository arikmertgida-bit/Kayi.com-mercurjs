/**
 * In-memory cache of userId → displayName.
 * Populated when users connect via socket (displayName in handshake auth).
 * Also persisted to UserProfile table for cross-restart durability.
 * Used for push notification enrichment and participant listing.
 */
export const userNameCache = new Map<string, string>()

import prisma from "./prisma"
import type { UserType } from "@prisma/client"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000"
const INTERNAL_SECRET = process.env.MESSENGER_INTERNAL_SECRET || "kayi-internal-secret"

/**
 * Persist a user's display name to DB and update in-memory cache.
 */
export async function setDisplayName(
  userId: string,
  displayName: string,
  userType: UserType
): Promise<void> {
  userNameCache.set(userId, displayName)
  try {
    await prisma.userProfile.upsert({
      where: { userId },
      update: { displayName, userType },
      create: { userId, displayName, userType },
    })
  } catch {
    // Cache is already set — DB failure is non-critical
  }
}

/**
 * Resolve a user's display name.
 * Priority: in-memory cache → DB → Medusa backend API → raw userId fallback.
 */
export async function resolveDisplayName(userId: string): Promise<string> {
  // 1. In-memory cache
  const cached = userNameCache.get(userId)
  if (cached) return cached

  // 2. DB lookup (survives server restarts)
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (profile?.displayName) {
      userNameCache.set(userId, profile.displayName)
      return profile.displayName
    }
  } catch {
    // Ignore DB errors
  }

  // 3. Backend API lookup (resolves names even for first-time users)
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/messenger-internal/user-name/${encodeURIComponent(userId)}`,
      {
        headers: { "x-internal-secret": INTERNAL_SECRET },
      }
    )
    if (res.ok) {
      const data = (await res.json()) as { userId: string; displayName: string }
      if (data.displayName && data.displayName !== userId) {
        // Persist to cache + DB so future lookups are instant
        userNameCache.set(userId, data.displayName)
        try {
          const userType: UserType = userId.startsWith("cus_") ? "CUSTOMER" : "SELLER"
          await prisma.userProfile.upsert({
            where: { userId },
            update: { displayName: data.displayName, userType },
            create: { userId, displayName: data.displayName, userType },
          })
        } catch {
          // Non-critical
        }
        return data.displayName
      }
    }
  } catch {
    // Ignore network errors — fall through to userId
  }

  return userId
}
