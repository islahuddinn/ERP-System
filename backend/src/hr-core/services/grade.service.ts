import { Injectable, NotFoundException } from "@nestjs/common";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { CreateGradeDto } from "../dto/create-grade.dto";
import { UpdateGradeDto } from "../dto/update-grade.dto";

@Injectable()
export class GradeService {
  constructor(private readonly prismaService: MultiTenantPrismaService) {}

  private async getTenantClient(tenantId: string): Promise<any> {
    return (await this.prismaService.getTenantClient(tenantId)) as any;
  }

  async listGrades(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.grade.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
  }

  async getGrade(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const grade = await prisma.grade.findUnique({ where: { id } });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    // Grades are not linked to employees in the schema yet, so the list is always empty.
    return { ...grade, employees: [] };
  }

  async createGrade(tenantId: string, dto: CreateGradeDto, userId: string) {
    const prisma = await this.getTenantClient(tenantId);

    return prisma.grade.create({
      data: {
        name: dto.name,
        level: dto.level,
        salaryBandMin: dto.salaryBandMin,
        salaryBandMax: dto.salaryBandMax,
        createdById: userId,
      },
    });
  }

  async updateGrade(
    tenantId: string,
    id: string,
    dto: UpdateGradeDto,
    userId: string,
  ) {
    const prisma = await this.getTenantClient(tenantId);
    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    return prisma.grade.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        level: dto.level ?? existing.level,
        salaryBandMin: dto.salaryBandMin ?? existing.salaryBandMin,
        salaryBandMax: dto.salaryBandMax ?? existing.salaryBandMax,
        createdById: existing.createdById ?? userId,
      },
    });
  }

  async deleteGrade(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    await prisma.grade.delete({ where: { id } });
  }
}

