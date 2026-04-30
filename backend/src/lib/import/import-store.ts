/**
 * In-process store for import transaction metadata and job status.
 *
 * Why not Redis directly?
 * MedusaJS v2 does not expose a first-class Redis client registration key that
 * is safe to resolve in route handlers across all deployment configurations.
 * Using a module-level Map is sufficient for this use-case:
 *   - Import sessions last ≤ 2 hours (TTL enforced below)
 *   - The backend runs as a single Node.js process (workerMode: "shared")
 *   - Stored payload is metadata only — parsed rows are kept in MinIO
 *
 * If horizontal scaling is ever needed, swap this module for a Redis-backed
 * implementation without changing the call sites.
 */

export interface TransactionMeta {
  transaction_id: string
  seller_id: string
  file_path: string          // MinIO object path for parsed JSON rows
  format: "csv" | "xlsx" | "xml"
  total: number
  to_create: number
  to_update: number
  categories_to_map: string[]
  sku_conflicts: { sku: string; row: number }[]
  parse_errors: { row: number; sku?: string; message: string }[]
  expires_at: number         // Unix ms
}

export interface JobStatus {
  job_id: string
  seller_id: string
  transaction_id: string
  status: "pending" | "running" | "done" | "failed"
  processed: number
  total: number
  created: number
  updated: number
  skipped: number
  errors: { row: number; sku?: string; message: string }[]
  sku_changes: { original: string; generated: string }[]
  error_log_path?: string    // MinIO path to downloadable error CSV
  started_at: number
  finished_at?: number
}

const transactions = new Map<string, TransactionMeta>()
const jobs = new Map<string, JobStatus>()

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000

// Periodic cleanup of expired transactions
setInterval(() => {
  const now = Date.now()
  for (const [id, meta] of transactions.entries()) {
    if (meta.expires_at < now) transactions.delete(id)
  }
  // Clean up jobs older than 4 hours
  const cutoff = now - 4 * 60 * 60 * 1000
  for (const [id, job] of jobs.entries()) {
    if (job.started_at < cutoff) jobs.delete(id)
  }
}, CLEANUP_INTERVAL_MS).unref()

// ── Transactions ─────────────────────────────────────────────────────────────

export function setTransaction(meta: Omit<TransactionMeta, "expires_at">): void {
  transactions.set(meta.transaction_id, {
    ...meta,
    expires_at: Date.now() + TWO_HOURS_MS,
  })
}

export function getTransaction(id: string): TransactionMeta | undefined {
  const meta = transactions.get(id)
  if (!meta) return undefined
  if (meta.expires_at < Date.now()) {
    transactions.delete(id)
    return undefined
  }
  return meta
}

export function deleteTransaction(id: string): void {
  transactions.delete(id)
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export function createJob(
  job_id: string,
  seller_id: string,
  transaction_id: string,
  total: number
): JobStatus {
  const job: JobStatus = {
    job_id,
    seller_id,
    transaction_id,
    status: "pending",
    processed: 0,
    total,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    sku_changes: [],
    started_at: Date.now(),
  }
  jobs.set(job_id, job)
  return job
}

export function updateJob(job_id: string, updates: Partial<JobStatus>): void {
  const job = jobs.get(job_id)
  if (job) jobs.set(job_id, { ...job, ...updates })
}

export function getJob(job_id: string): JobStatus | undefined {
  return jobs.get(job_id)
}
