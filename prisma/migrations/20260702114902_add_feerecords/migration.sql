/*
  Warnings:

  - You are about to drop the column `collectionPlanId` on the `Installment` table. All the data in the column will be lost.
  - You are about to drop the `CollectionPlan` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `feeRecordId` to the `Installment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeeRecordStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- DropForeignKey
ALTER TABLE "CollectionPlan" DROP CONSTRAINT "CollectionPlan_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Installment" DROP CONSTRAINT "Installment_collectionPlanId_fkey";

-- AlterTable
ALTER TABLE "Installment" DROP COLUMN "collectionPlanId",
ADD COLUMN     "feeRecordId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CollectionPlan";

-- CreateTable
CREATE TABLE "FeeRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "status" "FeeRecordStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeeRecord" ADD CONSTRAINT "FeeRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_feeRecordId_fkey" FOREIGN KEY ("feeRecordId") REFERENCES "FeeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
