import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260512000002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_like" ("id" text not null, "review_id" text not null, "customer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_like_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_like_deleted_at" ON "review_like" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_like" cascade;`);
  }

}
