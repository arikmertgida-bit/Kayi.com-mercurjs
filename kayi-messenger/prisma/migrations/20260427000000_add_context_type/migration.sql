-- CreateEnum
CREATE TYPE "ConversationContextType" AS ENUM ('PRODUCT_BASED', 'VENDOR_BASED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "contextType" "ConversationContextType" NOT NULL DEFAULT 'VENDOR_BASED';

-- Backfill existing rows
UPDATE "Conversation" SET "contextType" = 'PRODUCT_BASED' WHERE "productId" IS NOT NULL;
