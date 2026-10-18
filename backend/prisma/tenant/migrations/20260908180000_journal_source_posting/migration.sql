-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_type" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_id" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posting_kind" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "journal_entries_source_type_source_id_idx" ON "journal_entries"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_source_posting_unique" ON "journal_entries"("source_type", "source_id", "posting_kind");
