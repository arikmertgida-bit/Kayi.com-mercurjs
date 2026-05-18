import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260515000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "return_shipment" ("id" text not null, "order_return_request_id" text not null, "phase" text not null default 'awaiting_shipment', "tracking_number" text null, "carrier" text null, "approved_by" text not null, "approved_at" timestamptz not null, "shipped_at" timestamptz null, "received_at" timestamptz null, "approved_items" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_shipment_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_return_shipment_return_request_id" ON "return_shipment" ("order_return_request_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_return_shipment_phase" ON "return_shipment" ("phase") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_shipment_deleted_at" ON "return_shipment" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_shipment" cascade;`)
  }

}
