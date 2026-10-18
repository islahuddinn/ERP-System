import { Injectable } from "@nestjs/common";
import { AccountType, NormalBalance, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import {
  SYSTEM_ACCOUNT_CODES,
  SYSTEM_ACCOUNT_DEFINITIONS,
  SystemAccountKey,
} from "./utils/constants";

@Injectable()
export class GlAccountResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccountId(accountKey: SystemAccountKey): Promise<string> {
    const code = SYSTEM_ACCOUNT_CODES[accountKey];
    const definition = SYSTEM_ACCOUNT_DEFINITIONS[accountKey];

    const existing = await this.prisma.chartOfAccounts.findFirst({
      where: { accountCode: code, deletedAt: null },
      select: { id: true },
    });

    if (existing) return existing.id;

    try {
      const created = await this.prisma.chartOfAccounts.create({
        data: {
          accountCode: code,
          accountName: definition.accountName,
          accountType: definition.accountType as AccountType,
          normalBalance: definition.normalBalance as NormalBalance,
          isActive: true,
          description: "System account ensured by GL posting",
        },
        select: { id: true },
      });
      return created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.prisma.chartOfAccounts.findFirst({
          where: { accountCode: code, deletedAt: null },
          select: { id: true },
        });
        if (raced) return raced.id;
      }
      handlePrismaUniqueError(error, `Chart of accounts code ${code} already exists`);
    }
  }

  async resolveAccountIds(keys: SystemAccountKey[]): Promise<Record<SystemAccountKey, string>> {
    const uniqueKeys = [...new Set(keys)];
    const entries = await Promise.all(
      uniqueKeys.map(async (key) => [key, await this.resolveAccountId(key)] as const),
    );

    return Object.fromEntries(entries) as Record<SystemAccountKey, string>;
  }
}
