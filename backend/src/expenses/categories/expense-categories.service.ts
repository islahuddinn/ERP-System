import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";
import { AuditContextService } from "../../audit/audit-context.service";

@Injectable()
export class ExpenseCategoriesService {
  private readonly logger = new Logger(ExpenseCategoriesService.name);

  constructor(private auditContext: AuditContextService) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for expense categories");
    }
    return tenantClient;
  }

  async create(tenantClient: PrismaClient, createDto: CreateExpenseCategoryDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Creating expense category: ${createDto.name}`);

    // Check if category with same name exists
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException("Expense category with this name already exists");
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        icon: createDto.icon,
        color: createDto.color,
        isActive: createDto.isActive ?? true,
      },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense category created: ${category.id}`);
    return category;
  }

  async findAll(tenantClient: PrismaClient, includeInactive = false) {
    const prisma = this.getPrisma(tenantClient);

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.expenseCategory.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Expense category not found");
    }

    return category;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateExpenseCategoryDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    const existing = await this.findOne(prisma, id);

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    // Check if name is being changed and if new name already exists
    if (updateDto.name && updateDto.name !== existing.name) {
      const nameExists = await prisma.expenseCategory.findUnique({
        where: { name: updateDto.name },
      });

      if (nameExists) {
        throw new ConflictException("Expense category with this name already exists");
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: updateDto,
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense category updated: ${category.id}`);
    return category;
  }

  async remove(tenantClient: PrismaClient, id: string, userId: string) {
    const prisma = this.getPrisma(tenantClient);

    const category = await this.findOne(prisma, id);

    // Check if category has expenses
    const expenseCount = await prisma.expense.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (expenseCount > 0) {
      throw new BadRequestException("Cannot delete category with associated expenses");
    }

    // Capture pre-mutation snapshot for the @Auditable interceptor
    this.auditContext.setOldValue(category);
    this.auditContext.setEntityLabel(category.name);

    await prisma.expenseCategory.delete({
      where: { id },
    });

    // Audit logging handled by the @Auditable interceptor on the controller route.
    this.logger.log(`Expense category deleted: ${category.id}`);
    return { message: "Expense category deleted successfully" };
  }
}
