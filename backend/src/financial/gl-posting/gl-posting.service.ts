import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { GlAccountResolver } from "./gl-account-resolver.service";
import { GlPostingRepository } from "./gl-posting.repository";
import { MONEY_EPSILON } from "./utils/constants";
import { GL_POSTING_EXCEPTIONS } from "./utils/exceptions";
import { PostBalancedEntryInput, JournalEntryDetail } from "./utils/types";

function isPrismaUniqueOn(error: unknown, fragment: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  const haystack = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return haystack.toLowerCase().includes(fragment.toLowerCase());
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

@Injectable()
export class GlPostingService {
  constructor(
    private readonly glPostingRepository: GlPostingRepository,
    private readonly glAccountResolver: GlAccountResolver,
  ) {}

  listExceptions() {
    return GL_POSTING_EXCEPTIONS;
  }

  async postBalancedEntry(postBalancedEntryInput: PostBalancedEntryInput): Promise<JournalEntryDetail | null> {
    const { sourceType, sourceId, postingKind, entryDate, description, lines, createdById } =
      postBalancedEntryInput;

    const normalizedLines = lines
      .map((line) => ({
        ...line,
        debit: roundMoney(line.debit),
        credit: roundMoney(line.credit),
      }))
      .filter((line) => line.debit > 0 || line.credit > 0);

    if (normalizedLines.length === 0) {
      return null;
    }

    this.assertBalanced(normalizedLines);

    const existing = await this.glPostingRepository.findBySource(sourceType, sourceId, postingKind);
    if (existing) {
      return existing;
    }

    const accountIds = await this.glAccountResolver.resolveAccountIds(
      normalizedLines.map((line) => line.accountKey),
    );

    const totalDebit = roundMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = roundMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    const prefixDate = entryDate.toISOString().slice(0, 10).replace(/-/g, "");

    for (let attempt = 0; attempt < 5; attempt++) {
      const entryNumber = await this.glPostingRepository.nextEntryNumber(prefixDate);
      try {
        return await this.glPostingRepository.createPostedEntry({
          entryNumber,
          description,
          entryDate,
          totalDebit,
          totalCredit,
          sourceType,
          sourceId,
          postingKind,
          createdById,
          lines: normalizedLines.map((line) => ({
            accountId: accountIds[line.accountKey],
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        });
      } catch (error) {
        const raced = await this.glPostingRepository.findBySource(sourceType, sourceId, postingKind);
        if (raced) return raced;
        if (isPrismaUniqueOn(error, "entry_number") || isPrismaUniqueOn(error, "entryNumber")) {
          continue;
        }
        handlePrismaUniqueError(error, "A journal for this source document already exists");
      }
    }

    throw new ConflictException("Could not allocate a unique journal entry number");
  }

  private assertBalanced(lines: Array<{ debit: number; credit: number }>): void {
    if (lines.length < 2) {
      throw new BadRequestException("Journal entry must have at least 2 lines");
    }

    for (const line of lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException("Journal lines cannot have both debit and credit amounts");
      }
    }

    const totalDebit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));

    if (Math.abs(totalDebit - totalCredit) > MONEY_EPSILON) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }
  }
}
