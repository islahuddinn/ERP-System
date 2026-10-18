import { Prisma } from "@prisma/tenant-client";
import { JOURNAL_INCLUDE, SystemAccountKey } from "./constants";
import { GlPostingKind, GlSourceType } from "./enums";

export type JournalEntryDetail = Prisma.JournalEntryGetPayload<{ include: typeof JOURNAL_INCLUDE }>;

export type GlPostingLineInput = {
  accountKey: SystemAccountKey;
  debit: number;
  credit: number;
  description?: string;
};

export type PostBalancedEntryInput = {
  sourceType: GlSourceType;
  sourceId: string;
  postingKind: GlPostingKind;
  entryDate: Date;
  description: string;
  lines: GlPostingLineInput[];
  createdById?: string;
};
