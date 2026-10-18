import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for company operations");
    }

    return tenantClient;
  }

  async create(
    tenantClient: PrismaClient,
    name: string,
    code?: string,
    userId?: string,
  ): Promise<any> {
    const prisma = this.getPrisma(tenantClient);

    const existing = await prisma.company.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Company with this name already exists");
    return prisma.company.create({
      data: {
        name,
        code,
        createdById: userId || null,
        updatedById: userId || null,
      },
    });
  }

  async findAll(
    tenantClient: PrismaClient,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    },
  ) {
    const prisma = this.getPrisma(tenantClient);

    // If no page/limit specified, fetch all companies (no pagination)
    // If only page is provided without limit, default limit to 100
    // If limit is provided, use it for pagination
    const { page, limit, search, isActive } = params;

    // Determine if we should paginate
    const shouldPaginate = page !== undefined || limit !== undefined;

    // Set final values: if paginating, use provided values or defaults
    // If not paginating, set to undefined to fetch all
    const finalPage = shouldPaginate ? (page ?? 1) : undefined;
    const finalLimit = shouldPaginate ? (limit ?? 100) : undefined;
    const skip =
      finalLimit !== undefined && finalPage !== undefined
        ? (finalPage - 1) * finalLimit
        : undefined;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { name: "asc" },
        skip: skip ?? undefined,
        take: finalLimit ?? undefined,
        select: { id: true, name: true, code: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      prisma.company.count({ where }),
    ]);
    const data = companies.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code || undefined,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return {
      data,
      meta: {
        page: finalPage,
        limit: finalLimit,
        total,
        totalPages: finalLimit ? Math.ceil(total / finalLimit) : 1,
      },
    };
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    data: { name?: string; code?: string; isActive?: boolean },
    userId?: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    await this.findOne(prisma, id);
    if (data.name) {
      const exists = await prisma.company.findFirst({
        where: {
          name: { equals: data.name, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });
      if (exists) throw new ConflictException("Company with this name already exists");
    }
    return prisma.company.update({
      where: { id },
      data: {
        ...data,
        updatedById: userId || null,
      },
    });
  }

  async softDelete(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Deleting company: ${id}`);

    // Check if company exists
    await this.findOne(prisma, id);

    // Actually delete the company (hard delete)
    await prisma.company.delete({
      where: { id },
    });

    this.logger.log(`Company deleted successfully: ${id}`);
    return { message: "Company deleted successfully" };
  }

}
