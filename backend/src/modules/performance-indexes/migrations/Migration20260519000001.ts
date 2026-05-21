import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds a composite index on seller_seller_product_product(seller_id, product_id).
 *
 * This table is the core join table between sellers and products, created by
 * @mercurjs/b2c-core. Every ownership check (verifyProductOwnership) and every
 * vendor product listing query hits this table. Without an index, high-traffic
 * workloads trigger full sequential scans that exhaust PostgreSQL CPU.
 *
 * Zero-downtime strategy
 * ─────────────────────
 * CONCURRENTLY builds the index without holding an AccessShareLock on the table,
 * so reads and writes continue uninterrupted during index creation. This is
 * mandatory for production deployments — a regular CREATE INDEX would lock the
 * entire table for the duration of the build.
 *
 * Non-transactional migration
 * ───────────────────────────
 * PostgreSQL does not allow CREATE/DROP INDEX CONCURRENTLY inside a transaction
 * block. isTransactional() returns false so MikroORM executes the statement
 * in autocommit mode rather than wrapping it in BEGIN/COMMIT.
 *
 * Rollback (down)
 * ───────────────
 * DROP INDEX CONCURRENTLY releases the index without locking writes. IF EXISTS
 * ensures idempotency: reverting an already-reverted migration does not error.
 */
export class Migration20260519000001 extends Migration {

  override isTransactional(): boolean {
    return false
  }

  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sspp_seller_product"
         ON "seller_seller_product_product" ("seller_id", "product_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_sspp_seller_product";`,
    )
  }

}
