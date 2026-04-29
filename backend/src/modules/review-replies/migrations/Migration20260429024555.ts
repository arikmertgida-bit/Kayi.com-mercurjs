import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260429024555 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_reply" ("id" text not null, "review_id" text not null, "customer_id" text null, "seller_id" text null, "seller_name" text null, "content" text not null, "likes_count" integer not null default 0, "liked_by_ids" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_reply_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_deleted_at" ON "review_reply" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_reply" cascade;`);
  }

}
