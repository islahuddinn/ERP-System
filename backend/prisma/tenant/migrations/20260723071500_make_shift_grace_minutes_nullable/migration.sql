-- AlterTable
-- Grace Time is optional; make the column nullable so the app can
-- distinguish "not explicitly set" (null) from a genuine, explicit 0
-- (no grace period allowed).
ALTER TABLE "hr_shifts" ALTER COLUMN "grace_minutes" DROP NOT NULL;
