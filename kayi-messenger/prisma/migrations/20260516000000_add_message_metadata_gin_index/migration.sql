-- AddIndex: GIN index on Message.metadata (JSONB) for fast promotion-based deletions.
-- Uses jsonb_path_ops operator class which is optimised for @> containment queries
-- such as: WHERE metadata @> '{"promotion_id": "promo_xxx"}'
-- NOTE: CONCURRENTLY is intentionally omitted — it cannot run inside a Prisma
-- transaction (migrate deploy wraps every migration in BEGIN/COMMIT).
-- IF NOT EXISTS makes this safe to re-run.
CREATE INDEX IF NOT EXISTS "idx_message_metadata_gin"
ON "Message" USING GIN ("metadata" jsonb_path_ops);
