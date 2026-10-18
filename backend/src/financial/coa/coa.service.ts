import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class CoaService {
  constructor(private prisma: PrismaService) {}

  async create(createAccountDto: CreateAccountDto, userId?: string) {
    // Check if account code already exists
    const existingAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { accountCode: createAccountDto.accountCode }
    });

    if (existingAccount) {
      throw new BadRequestException(`Account code ${createAccountDto.accountCode} already exists`);
    }

    // Handle parentId - convert empty string to null
    const parentId = createAccountDto.parentId && createAccountDto.parentId.trim() !== '' 
      ? createAccountDto.parentId 
      : null;

    // If parentId is provided, validate it exists
    if (parentId) {
      const parent = await this.prisma.chartOfAccounts.findUnique({
        where: { id: parentId }
      });

      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }
    }

    return this.prisma.chartOfAccounts.create({
      data: {
        ...createAccountDto,
        parentId: parentId || null,
        createdById: userId || null
      },
      include: {
        parent: true,
        children: true
      }
    });
  }

  async findAll() {
    return this.prisma.chartOfAccounts.findMany({
      where: { 
        isActive: true
      },
      orderBy: { accountCode: 'asc' }
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        journalLines: {
          select: {
            id: true,
            debitAmount: true,
            creditAmount: true,
            description: true
          }
        }
      }
    });

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    const existingAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { id }
    });

    if (!existingAccount) {
      throw new BadRequestException('Account not found');
    }

    // If account code is being updated, check for duplicates
    if (updateAccountDto.accountCode && updateAccountDto.accountCode !== existingAccount.accountCode) {
      const duplicateAccount = await this.prisma.chartOfAccounts.findUnique({
        where: { accountCode: updateAccountDto.accountCode }
      });

      if (duplicateAccount) {
        throw new BadRequestException(`Account code ${updateAccountDto.accountCode} already exists`);
      }
    }

    // If parentId is being updated, validate it exists and prevent circular references
    if (updateAccountDto.parentId !== undefined) {
      if (updateAccountDto.parentId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }

      if (updateAccountDto.parentId) {
        const parent = await this.prisma.chartOfAccounts.findUnique({
          where: { id: updateAccountDto.parentId }
        });

        if (!parent) {
          throw new BadRequestException('Parent account not found');
        }

        // Check for circular reference
        const isDescendant = await this.isDescendant(updateAccountDto.parentId, id);
        if (isDescendant) {
          throw new BadRequestException('Cannot set a descendant account as parent');
        }
      }
    }

    return this.prisma.chartOfAccounts.update({
      where: { id },
      data: updateAccountDto,
      include: {
        parent: true,
        children: true
      }
    });
  }

  async remove(id: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id },
      include: {
        children: true,
        journalLines: true
      }
    });

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    // Check if account has children
    if (account.children.length > 0) {
      throw new BadRequestException('Cannot delete account with child accounts');
    }

    // Check if account has journal entries
    if (account.journalLines.length > 0) {
      throw new BadRequestException('Cannot delete account with journal entries');
    }

    // Soft delete by setting isActive to false
    return this.prisma.chartOfAccounts.update({
      where: { id },
      data: { isActive: false }
    });
  }

  private async isDescendant(parentId: string, childId: string): Promise<boolean> {
    const child = await this.prisma.chartOfAccounts.findUnique({
      where: { id: childId },
      include: { children: true }
    });

    if (!child) {
      return false;
    }

    for (const childAccount of child.children) {
      if (childAccount.id === parentId) {
        return true;
      }
      const isChildDescendant = await this.isDescendant(parentId, childAccount.id);
      if (isChildDescendant) {
        return true;
      }
    }

    return false;
  }

  async getHierarchy() {
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: { accountCode: 'asc' }
    });

    // Build tree structure
    const accountMap = new Map();
    const rootAccounts: any[] = [];

    // Create map of all accounts
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Build hierarchy
    accounts.forEach(account => {
      const accountNode = accountMap.get(account.id);
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId).children.push(accountNode);
      } else {
        rootAccounts.push(accountNode);
      }
    });

    return rootAccounts;
  }
}
