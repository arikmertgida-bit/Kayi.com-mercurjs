/**
 * Creates the seller_daily_stats table and index.
 * Safe to re-run (uses IF NOT EXISTS).
 * Run once after deploy to prepare the analytics infrastructure.
 */
import { Client } from "pg"

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

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

  await client.end()
  console.log("seller_daily_stats table and index ensured.")
}

main().catch((err: Error) => {
  console.error("create-seller-stats:", err.message)
  process.exit(1)
})
