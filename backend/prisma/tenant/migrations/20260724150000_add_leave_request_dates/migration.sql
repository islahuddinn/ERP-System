-- AlterTable
ALTER TABLE "hr_leave_requests" ADD COLUMN "leave_dates" DATE[] NOT NULL DEFAULT '{}';
