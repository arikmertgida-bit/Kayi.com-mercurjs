/**
 * BullMQ Queue definition for product import jobs.
 *
 * Design decisions:
 * - FIFO ordering (default BullMQ behavior)
 * - concurrency: 3  → 3 import jobs can run in parallel (safe for single-process)
 * - No automatic retry (attempts: 1): partial errors are handled inside the
 *   worker per-variant, not at the job level. A job-level retry would re-import
 *   all variants including those already created.
 * - Jobs are kept for debugging: 200 completed, 500 failed
 */
import { Queue } from "bullmq"
import { GroupedProduct } from "./grouper.js"

// ── Redis connection (parsed from REDIS_URL env) ──────────────────────────────

function buildRedisOpts() {
  const url = process.env.REDIS_URL || "redis://localhost:6379"
  try {
    const u = new URL(url)
    return {
      host: u.hostname || "redis",
      port: parseInt(u.port || "6379", 10),
      password: u.password || undefined,
      db: parseInt(u.pathname?.slice(1) || "0", 10) || 0,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  } catch {
    return {
      host: "redis",
      port: 6379,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  }
}

export const IMPORT_QUEUE_NAME = "kayi-import"
export const redisOpts = buildRedisOpts()

// ── Job payload ───────────────────────────────────────────────────────────────

export interface ImportWorkerJobData {
  /** Our import-store job_id (for status tracking) */
  job_id: string
  seller_id: string
  /** Last 6 chars of seller.id — used for SKU conflict suffix */
  seller_suffix: string
  /** MinIO path to the grouped products JSON array */
  minio_path: string
  /** Category name → platform category id */
  category_mapping: { name: string; platform_id: string }[]
  stock_location_id?: string
  /** Override stock for ALL variants */
  total_stock?: number
  /** Total number of VARIANTS (for progress reporting) */
  total_variants: number
}

// ── Singleton queue ───────────────────────────────────────────────────────────

let _queue: Queue<ImportWorkerJobData> | null = null

export function getImportQueue(): Queue<ImportWorkerJobData> {
  if (!_queue) {
    _queue = new Queue<ImportWorkerJobData>(IMPORT_QUEUE_NAME, {
      connection: redisOpts,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    })
  }
  return _queue
}
