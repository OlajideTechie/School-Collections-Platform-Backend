/*
  Warnings:

  - Made the column `email` on table `School` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "School" ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "SchoolSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSession_token_key" ON "SchoolSession"("token");

-- AddForeignKey
ALTER TABLE "SchoolSession" ADD CONSTRAINT "SchoolSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
