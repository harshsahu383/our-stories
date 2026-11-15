-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "StoryPrompt" ADD COLUMN     "aiFollowUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'PENDING';
