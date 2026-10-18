-- CreateEnum
CREATE TYPE "TransporterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "transporters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "vehicle_registration" TEXT,
    "notes" TEXT,
    "status" "TransporterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transporters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transporters_code_key" ON "transporters"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transporters_name_key" ON "transporters"("name");

-- CreateIndex
CREATE INDEX "transporters_status_idx" ON "transporters"("status");

-- CreateIndex
CREATE INDEX "transporters_phone_idx" ON "transporters"("phone");

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'SALES_MANAGEMENT_TRANSPORTERS';
