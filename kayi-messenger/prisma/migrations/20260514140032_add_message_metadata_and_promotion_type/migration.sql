-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'PROMOTION';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "metadata" JSONB;
