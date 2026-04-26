-- CreateTable
CREATE TABLE "ConversationHide" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationHide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationHide_conversationId_idx" ON "ConversationHide"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationHide_userId_idx" ON "ConversationHide"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationHide_conversationId_userId_key" ON "ConversationHide"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "ConversationHide" ADD CONSTRAINT "ConversationHide_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
