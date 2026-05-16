import Redis from "ioredis"

/**
 * Module-level lazy singleton Redis client.
 *
 * Rationale: Stateful connections (Redis, DB pools) are better managed as
 * module-level singletons than as DI-registered values. The connection is
 * created once at first use and reused across all callers in the same process.
 *
 * Graceful degradation: returns null when REDIS_URL is not configured, allowing
 * callers to fall back to in-memory alternatives (e.g. single-process Map locks).
 *
 * Error handling: the "error" event is captured to prevent Node.js from
 * crashing on connection failures. The client reconnects automatically (ioredis default).
 */

let redisInstance: Redis | null = null

/**
 * Returns the shared Redis client instance.
 *
 * - Returns `null` if `REDIS_URL` environment variable is not set.
 * - On the first call (when REDIS_URL is present), creates and caches the client.
 * - Subsequent calls return the same cached instance.
 */
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL, {
      // Do not block startup if Redis is temporarily unreachable.
      // ioredis will retry automatically with exponential backoff.
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })

    // Prevent unhandled error events from crashing the Node.js process.
    // Individual callers already handle Redis failures via try/catch.
    redisInstance.on("error", (_err: unknown) => {
      // Intentionally silent — callers fall back gracefully on operation failure.
    })
  }

  return redisInstance
}
