import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateJournalDto } from "./dto/create-journal.dto";
import { EntryStatus } from "@prisma/tenant-client";

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async create(createJournalDto: CreateJournalDto) {
    // Validate business rules
    this.validateJournalEntry(createJournalDto);

    // Generate unique entry number
    const entryNumber = await this.generateEntryNumber();

    // Calculate totals
    const totalDebit = createJournalDto.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = createJournalDto.lines.reduce((sum, line) => sum + Number(line.credit), 0);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate: new Date(createJournalDto.entryDate),
        description: createJournalDto.description,
        totalDebit,
        totalCredit,
        sourceType: createJournalDto.sourceType ?? null,
        sourceId: createJournalDto.sourceId ?? null,
        postingKind: createJournalDto.postingKind ?? null,
        journalLines: {
          create: createJournalDto.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debitAmount: line.debit,
            creditAmount: line.credit,
          })),
        },
      },
      include: {
        journalLines: true,
      },
    });
  }

  async findAll() {
    return this.prisma.journalEntry.findMany({
      orderBy: { entryDate: "desc" },
      include: {
        journalLines: true,
      },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journalLines: true,
      },
    });

    if (!entry) {
      throw new BadRequestException("Journal entry not found");
    }

    return entry;
  }

  async post(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { journalLines: true },
    });

    if (!entry) {
      throw new BadRequestException("Journal entry not found");
    }

    if (entry.status === EntryStatus.POSTED) {
      throw new BadRequestException("Journal entry is already posted");
    }

    if (entry.status === EntryStatus.REVERSED) {
      throw new BadRequestException("Cannot post a reversed journal entry");
    }

    if (entry.journalLines.length === 0) {
      throw new BadRequestException("Cannot post an empty journal entry");
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: EntryStatus.POSTED,
        postedAt: new Date(),
      },
      include: {
        journalLines: true,
      },
    });
  }

  async reverse(id: string, reason: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journalLines: true,
      },
    });

    if (!entry) {
      throw new BadRequestException("Journal entry not found");
    }

    if (entry.status !== EntryStatus.POSTED) {
      throw new BadRequestException("Only posted entries can be reversed");
    }

    // Create reversal lines
    const reversalLines = entry.journalLines.map((line) => ({
      accountId: line.accountId,
      description: line.description,
      debitAmount: line.creditAmount, // Swapped
      creditAmount: line.debitAmount, // Swapped
      journalId: "reversal-placeholder",
    }));

    // Create reversing entry
    const reversalEntryNumber = await this.generateEntryNumber();
    const reversalEntry = await this.prisma.journalEntry.create({
      data: {
        entryNumber: reversalEntryNumber,
        entryDate: new Date(),
        description: `REVERSAL: ${entry.description} - ${reason}`,
        totalDebit: entry.totalCredit, // Swapped
        totalCredit: entry.totalDebit, // Swapped
        journalLines: {
          create: reversalLines,
        },
      },
      include: {
        journalLines: true,
      },
    });

    // Mark original entry as reversed
    await this.prisma.journalEntry.update({
      where: { id: id },
      data: { status: EntryStatus.REVERSED },
    });

    // Post the reversal entry automatically
    await this.prisma.journalEntry.update({
      where: { id: reversalEntry.id },
      data: {
        status: EntryStatus.POSTED,
        postedAt: new Date(),
      },
    });

    return reversalEntry;
  }

  async getPostedEntries(startDate?: Date, endDate?: Date) {
    const whereClause: any = { status: EntryStatus.POSTED };

    if (startDate || endDate) {
      whereClause.entryDate = {};
      if (startDate) whereClause.entryDate.gte = startDate;
      if (endDate) whereClause.entryDate.lte = endDate;
    }

    return this.prisma.journalEntry.findMany({
      where: whereClause,
      orderBy: { entryDate: "desc" },
      include: {
        journalLines: true,
      },
    });
  }

  private validateJournalEntry(createJournalDto: CreateJournalDto) {
    // Check at least 2 lines
    if (createJournalDto.lines.length < 2) {
      throw new BadRequestException("Journal entry must have at least 2 lines");
    }

    // Check for zero entries
    const hasZeroEntries = createJournalDto.lines.some(
      (line) => Number(line.debit) === 0 && Number(line.credit) === 0,
    );

    if (hasZeroEntries) {
      throw new BadRequestException("Journal lines cannot have zero debit and credit amounts");
    }

    // Check for both debit and credit in same line
    const hasBothDebitAndCredit = createJournalDto.lines.some(
      (line) => Number(line.debit) > 0 && Number(line.credit) > 0,
    );

    if (hasBothDebitAndCredit) {
      throw new BadRequestException("Journal lines cannot have both debit and credit amounts");
    }

    // Calculate totals
    const totalDebit = createJournalDto.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = createJournalDto.lines.reduce((sum, line) => sum + Number(line.credit), 0);

    // Check if balanced
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      // Allow for floating point precision
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    // Check if totals are zero
    if (totalDebit === 0 && totalCredit === 0) {
      throw new BadRequestException("Journal entry cannot have zero total amounts");
    }
  }

  private async generateEntryNumber(): Promise<string> {
    const prefix = "JE";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // Find the highest sequence number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: {
        entryNumber: {
          startsWith: `${prefix}${date}`,
        },
      },
      orderBy: {
        entryNumber: "desc",
      },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSequence = parseInt(lastEntry.entryNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${date}${sequence.toString().padStart(3, "0")}`;
  }

  // Operational auto-post lives in GlPostingService. Manual journals use create() + post().
  async autoPost(): Promise<never> {
    throw new BadRequestException(
      "Use GlPostingService.postBalancedEntry for operational auto-posting",
    );
  }
}
