/**
 * Ensures review_reply table has the likes_count and liked_by_ids columns.
 * Run after db:migrate to cover manually-created tables that MikroORM missed.
 */
import { Client } from "pg"

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query(`
    ALTER TABLE review_reply
      ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;
    ALTER TABLE review_reply
      ADD COLUMN IF NOT EXISTS liked_by_ids jsonb;
  `)
  await client.end()
  console.log("review_reply columns ensured.")
}

main().catch((err: Error) => {
  console.error("ensure-columns:", err.message)
  process.exit(0) // non-fatal
})
