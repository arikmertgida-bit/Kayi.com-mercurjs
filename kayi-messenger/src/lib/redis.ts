import { Redis } from "ioredis"

/**
 * Shared Redis client for general-purpose operations (typing state, room tracking).
 * Kept separate from the Socket.io pub/sub adapter clients (redisPub / redisSub)
 * to avoid interfering with the adapter's pub/sub protocol.
 */
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
})

redis.on("error", (err: Error) => {
  console.error("[redis-shared] connection error:", err.message)
})

// ─── Typing Indicators (Redis Sorted Set) ─────────────────────────────────────
//
// Key pattern: typing:{conversationId}
// Structure:   ZSET where member = userId, score = expiryTimestamp (ms)
// TTL logic:   score represents when this entry expires; filtered on read.
// Cross-pod:   all pods share the same ZSET — no in-process Map needed.

const TYPING_TTL_MS = 3_000 // 3 seconds

/**
 * Marks a user as typing in a conversation.
 * Score = now + TTL so stale entries self-expire on read.
 */
export async function redisTypingSet(conversationId: string, userId: string): Promise<void> {
  const key = `typing:${conversationId}`
  const expireAt = Date.now() + TYPING_TTL_MS
  // Pipeline both commands — atomically write score and reset key TTL
  await redis
    .pipeline()
    .zadd(key, expireAt, userId)
    .pexpire(key, TYPING_TTL_MS * 10)
    .exec()
}

/**
 * Removes a user's typing indicator immediately.
 */
export async function redisTypingClear(conversationId: string, userId: string): Promise<void> {
  await redis.zrem(`typing:${conversationId}`, userId)
}

/**
 * Returns the list of users currently typing in a conversation.
 * Filters out stale entries whose score (expiry timestamp) has already passed.
 */
export async function redisTypingGet(conversationId: string): Promise<string[]> {
  const now = Date.now()
  // Remove expired entries before reading (keep O(1) overhead small)
  await redis.zremrangebyscore(`typing:${conversationId}`, "-inf", now - 1)
  return redis.zrangebyscore(`typing:${conversationId}`, now, "+inf")
}

/**
 * Clears all typing indicators for a user across all tracked conversations.
 * Called on socket disconnect — returns list of affected conversationIds.
 *
 * Implementation note: uses a Redis SET `typing:user_convs:{userId}` to track
 * which conversations the user is in, avoiding a full SCAN.
 */
export async function redisTypingClearAll(userId: string): Promise<string[]> {
  const convsKey = `typing:user_convs:${userId}`
  const conversationIds = await redis.smembers(convsKey)
  if (conversationIds.length === 0) return []

  const pipeline = redis.pipeline()
  for (const convId of conversationIds) {
    pipeline.zrem(`typing:${convId}`, userId)
  }
  pipeline.del(convsKey)
  await pipeline.exec()
  return conversationIds
}

/**
 * Tracks that a user is typing in a specific conversation (for ClearAll).
 */
export async function redisTypingTrackConv(conversationId: string, userId: string): Promise<void> {
  const convsKey = `typing:user_convs:${userId}`
  await redis.sadd(convsKey, conversationId)
  await redis.expire(convsKey, 3600) // 1h safety TTL
}

// ─── Room Presence (Redis Set) ────────────────────────────────────────────────
//
// Key pattern: room:active:{conversationId}
// Tracks which users are currently viewing a conversation (joined the socket room).
// Replaces the expensive `io.fetchSockets()` cross-pod call in notifyAbsentParticipants.

const ROOM_KEY_TTL_S = 3600 // 1 hour safety TTL

/**
 * Marks a user as actively viewing a conversation room.
 */
export async function redisRoomJoin(conversationId: string, userId: string): Promise<void> {
  const key = `room:active:${conversationId}`
  await redis.sadd(key, userId)
  await redis.expire(key, ROOM_KEY_TTL_S)
}

/**
 * Removes a user from a conversation's active room set.
 */
export async function redisRoomLeave(conversationId: string, userId: string): Promise<void> {
  await redis.srem(`room:active:${conversationId}`, userId)
}

/**
 * Returns the set of user IDs currently active in a conversation room.
 */
export async function redisRoomMembers(conversationId: string): Promise<Set<string>> {
  const members = await redis.smembers(`room:active:${conversationId}`)
  return new Set(members)
}
