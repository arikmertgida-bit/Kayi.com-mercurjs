/**
 * Backfill script: seeds seller_daily_stats from historical order data.
 *
 * Safe to run multiple times (idempotent — uses ON CONFLICT DO UPDATE).
 * Run once after deploying the analytics system to populate past data.
 *
 * Usage:
 *   DATABASE_URL=... npx ts-node src/scripts/backfill-seller-stats.ts
 */
import { Client } from "pg"

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log("[backfill] Connected to database.")

  // ── Step 1: Ensure table exists ─────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_daily_stats (
      id           SERIAL PRIMARY KEY,
      seller_id    TEXT NOT NULL,
      date         DATE NOT NULL,
      orders_count INTEGER NOT NULL DEFAULT 0,
      revenue      NUMERIC(10,2) NOT NULL DEFAULT 0,
      CONSTRAINT seller_daily_stats_seller_date_unique UNIQUE (seller_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_seller_daily_stats_seller_date
      ON seller_daily_stats (seller_id, date);
  `)
  console.log("[backfill] Table seller_daily_stats ensured.")

  // ── Step 2: Discover the seller-order link table ────────────────────────────
  const linkTableResult = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name ILIKE '%seller%order%'
    ORDER BY table_name
    LIMIT 10
  `)

  let linkTable: string | undefined
  for (const { table_name } of linkTableResult.rows) {
    const colResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = $1
         AND column_name IN ('seller_id', 'order_id')`,
      [table_name]
    )
    const cols = colResult.rows.map((r) => r.column_name)
    if (cols.includes("seller_id") && cols.includes("order_id")) {
      linkTable = table_name
      break
    }
  }

  if (!linkTable) {
    console.error(
      "[backfill] Could not find a seller-order link table with seller_id and order_id columns."
    )
    console.error(
      "[backfill] Tables found:",
      linkTableResult.rows.map((r) => r.table_name).join(", ") || "none"
    )
    process.exit(1)
  }
  console.log(`[backfill] Using link table: ${linkTable}`)

  // ── Step 3: Aggregate historical orders by seller + date ────────────────────
  const { rows } = await client.query<{
    seller_id: string
    date: string
    orders_count: number
    revenue: string
  }>(
    `SELECT
       sl.seller_id,
       DATE(o.created_at AT TIME ZONE 'UTC')::text AS date,
       COUNT(*)::int                               AS orders_count,
       COALESCE(SUM(o.total) / 100.0, 0)          AS revenue
     FROM "order" o
     INNER JOIN "${linkTable}" sl ON sl.order_id = o.id
     WHERE o.deleted_at IS NULL
     GROUP BY sl.seller_id, DATE(o.created_at AT TIME ZONE 'UTC')
     ORDER BY sl.seller_id, date`
  )

  const totalRows = rows.length
  const uniqueSellers = new Set(rows.map((r) => r.seller_id)).size
  console.log(
    `[backfill] Found ${totalRows} seller-date groups across ${uniqueSellers} sellers.`
  )

  if (totalRows === 0) {
    console.log("[backfill] Nothing to backfill. Exiting.")
    await client.end()
    return
  }

  // ── Step 4: Upsert each row ─────────────────────────────────────────────────
  let written = 0
  for (const row of rows) {
    await client.query(
      `INSERT INTO seller_daily_stats (seller_id, date, orders_count, revenue)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (seller_id, date)
       DO UPDATE SET
         orders_count = EXCLUDED.orders_count,
         revenue      = EXCLUDED.revenue`,
      [row.seller_id, row.date, row.orders_count, Number(row.revenue)]
    )
    written++
    if (written % 100 === 0) {
      console.log(`[backfill] Progress: ${written} / ${totalRows} rows written...`)
    }
  }

  await client.end()
  console.log(
    `[backfill] Done. ${written} rows written across ${uniqueSellers} sellers.`
  )
}

main().catch((err: Error) => {
  console.error("[backfill] Fatal error:", err.message)
  process.exit(1)
})
