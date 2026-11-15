-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('MAIN', 'PERMANENT_FOLLOW_UP', 'AI_FOLLOW_UP');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "permanentFollowUpText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Recording" ADD COLUMN     "answerType" "AnswerType" NOT NULL DEFAULT 'MAIN',
ADD COLUMN     "storyPromptId" TEXT;

-- CreateTable
CREATE TABLE "StoryPrompt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "permanentFollowUpText" TEXT NOT NULL,
    "aiFollowUpText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryPrompt_sessionId_sortOrder_idx" ON "StoryPrompt"("sessionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPrompt_sessionId_questionId_key" ON "StoryPrompt"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "Recording_sessionId_createdAt_idx" ON "Recording"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Recording_storyPromptId_answerType_idx" ON "Recording"("storyPromptId", "answerType");

-- AddForeignKey
ALTER TABLE "StoryPrompt" ADD CONSTRAINT "StoryPrompt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StorySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPrompt" ADD CONSTRAINT "StoryPrompt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_storyPromptId_fkey" FOREIGN KEY ("storyPromptId") REFERENCES "StoryPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
