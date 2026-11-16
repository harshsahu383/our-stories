-- AlterTable
ALTER TABLE "StorySession" ADD COLUMN     "giftId" TEXT;

-- CreateIndex
CREATE INDEX "StorySession_giftId_idx" ON "StorySession"("giftId");

-- AddForeignKey
ALTER TABLE "StorySession" ADD CONSTRAINT "StorySession_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
