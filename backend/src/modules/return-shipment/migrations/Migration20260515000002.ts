import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260515000002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "return_shipment" add column if not exists "approved_items" jsonb null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "return_shipment" drop column if exists "approved_items";`)
  }

}
