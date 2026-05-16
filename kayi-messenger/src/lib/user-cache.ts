/**
 * In-memory cache of userId → displayName.
 * Populated when users connect via socket (displayName in handshake auth).
 * Also persisted to UserProfile table for cross-restart durability.
 * Used for push notification enrichment and participant listing.
 */
const MAX_DISPLAY_NAME_CACHE = 10_000
export const userNameCache = new Map<string, string>()

/** Bounded FIFO insertion — evicts oldest entry when the cache limit is reached */
function cacheSet(userId: string, name: string): void {
  if (userNameCache.size >= MAX_DISPLAY_NAME_CACHE) {
    const firstKey = userNameCache.keys().next().value
    if (firstKey !== undefined) userNameCache.delete(firstKey)
  }
  userNameCache.set(userId, name)
}

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
  cacheSet(userId, displayName)
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
      cacheSet(userId, profile.displayName)
      return profile.displayName
    }
  } catch {
    // Ignore DB errors
  }

  // 3. Backend API lookup (resolves names even for first-time users)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    let res: Response
    try {
      res = await fetch(
        `${BACKEND_URL}/store/messenger-internal/user-name/${encodeURIComponent(userId)}`,
        {
          headers: { "x-internal-secret": INTERNAL_SECRET },
          signal: controller.signal,
        }
      )
    } finally {
      clearTimeout(timeoutId)
    }
    if (res.ok) {
      const data = (await res.json()) as { userId: string; displayName: string }
      if (data.displayName && data.displayName !== userId) {
        // Persist to cache + DB so future lookups are instant
        cacheSet(userId, data.displayName)
        try {
          const userType: UserType = userId.startsWith("cus_") ? "CUSTOMER" : userId.startsWith("usr_") ? "ADMIN" : "SELLER"
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

/**
 * Resolve display names for multiple user IDs in a single batched operation.
 * Priority: in-memory cache → bulk DB query → concurrent API lookups.
 * Significantly reduces N+1 HTTP calls when enriching conversation participant lists.
 */
export async function bulkResolveDisplayNames(
  userIds: readonly string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (userIds.length === 0) return result

  // 1. In-memory cache
  const uncachedIds: string[] = []
  for (const uid of userIds) {
    const cached = userNameCache.get(uid)
    if (cached) {
      result.set(uid, cached)
    } else {
      uncachedIds.push(uid)
    }
  }

  if (uncachedIds.length === 0) return result

  // 2. Bulk DB lookup — single query instead of N queries
  const dbMissIds: string[] = []
  try {
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: uncachedIds } },
      select: { userId: true, displayName: true },
    })
    const foundInDb = new Set<string>()
    for (const p of profiles) {
      if (p.displayName) {
        cacheSet(p.userId, p.displayName)
        result.set(p.userId, p.displayName)
        foundInDb.add(p.userId)
      }
    }
    for (const uid of uncachedIds) {
      if (!foundInDb.has(uid)) dbMissIds.push(uid)
    }
  } catch {
    // Fall back to API for all uncached IDs
    dbMissIds.push(...uncachedIds)
  }

  if (dbMissIds.length === 0) return result

  // 3. Concurrent API lookups for remaining misses (no sequential N+1)
  await Promise.allSettled(
    dbMissIds.map(async (uid) => {
      const name = await resolveDisplayName(uid)
      result.set(uid, name)
    })
  )

  return result
}
