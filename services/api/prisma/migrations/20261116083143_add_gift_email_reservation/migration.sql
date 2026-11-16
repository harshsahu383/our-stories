/*
  Warnings:

  - A unique constraint covering the columns `[recipientEmailReserved]` on the table `Gift` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Gift` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GiftStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'ACTIVATED', 'CANCELLED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Gift" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "personalNote" TEXT,
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientEmailReserved" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "status" "GiftStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Gift_recipientEmailReserved_key" ON "Gift"("recipientEmailReserved");

-- CreateIndex
CREATE INDEX "Gift_purchaserId_createdAt_idx" ON "Gift"("purchaserId", "createdAt");

-- CreateIndex
CREATE INDEX "Gift_recipientEmail_idx" ON "Gift"("recipientEmail");
