import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateProductionLineDto,
  UpdateProductionLineDto,
  ProductionLineStatus,
} from "./dto/production-line.dto";

@Injectable()
export class ProductionLinesRepository {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProductionLineDto, tenantId: string) {
    return this.prisma.productionLine.create({
      data: {
        ...createDto,
        tenantId,
        notes: createDto.notes || null,
        description: createDto.description || null,
        location: createDto.location || null,
        operatingHours: createDto.operatingHours || null,
        departments: createDto.departments || [],
        certifications: createDto.certifications || [],
        equipment: createDto.equipment || [],
      },
      include: {
        plant: true,
      },
    });
  }

  async findAll(tenantId: string, filters: any = {}) {
    const where = {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.lineType && { lineType: filters.lineType }),
      ...(filters.plantId && { plantId: filters.plantId }),
      ...(filters.supervisorId && { supervisorId: filters.supervisorId }),
      ...(filters.startDate && {
        createdAt: {
          gte: new Date(filters.startDate),
        },
      }),
      ...(filters.endDate && {
        createdAt: {
          lte: new Date(filters.endDate),
        },
      }),
    };

    const [productionLines, total] = await Promise.all([
      this.prisma.productionLine.findMany({
        where,
        include: {
          plant: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: filters.page
          ? (parseInt(filters.page) - 1) * parseInt(filters.limit || "10")
          : 0,
        take: parseInt(filters.limit || "10"),
      }),
      this.prisma.productionLine.count({ where }),
    ]);

    return { productionLines, total };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.productionLine.findFirst({
      where: { id, tenantId },
      include: {
        plant: true,
      },
    });
  }

  async update(
    id: string,
    updateDto: UpdateProductionLineDto,
    tenantId: string,
  ) {
    return this.prisma.productionLine.update({
      where: { id, tenantId },
      data: updateDto,
      include: {
        plant: true,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    return this.prisma.productionLine.delete({
      where: { id, tenantId },
    });
  }

  async updateStatus(
    id: string,
    status: ProductionLineStatus,
    tenantId: string,
  ) {
    return this.prisma.productionLine.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  async updateLoad(id: string, currentLoad: number, tenantId: string) {
    return this.prisma.productionLine.update({
      where: { id, tenantId },
      data: { currentLoad },
    });
  }

  async getProductionLineStats(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };

    if (filters.plantId) {
      where.plantId = filters.plantId;
    }

    if (filters.supervisorId) {
      where.supervisorId = filters.supervisorId;
    }

    const [
      totalLines,
      activeLines,
      inactiveLines,
      maintenanceLines,
      underRepairLines,
      decommissionedLines,
    ] = await Promise.all([
      this.prisma.productionLine.count({ where }),
      this.prisma.productionLine.count({
        where: { ...where, status: ProductionLineStatus.ACTIVE },
      }),
      this.prisma.productionLine.count({
        where: { ...where, status: ProductionLineStatus.INACTIVE },
      }),
      this.prisma.productionLine.count({
        where: { ...where, status: ProductionLineStatus.MAINTENANCE },
      }),
      this.prisma.productionLine.count({
        where: { ...where, status: ProductionLineStatus.UNDER_REPAIR },
      }),
      this.prisma.productionLine.count({
        where: { ...where, status: ProductionLineStatus.DECOMMISSIONED },
      }),
    ]);

    return {
      totalLines,
      activeLines,
      inactiveLines,
      maintenanceLines,
      underRepairLines,
      decommissionedLines,
      activeRate: totalLines > 0 ? (activeLines / totalLines) * 100 : 0,
    };
  }

  async validatePlant(plantId: string) {
    return this.prisma.plant.findFirst({
      where: { id: plantId },
    });
  }

  async validateSupervisor(supervisorId: string) {
    return this.prisma.user.findFirst({
      where: { id: supervisorId },
    });
  }

  async validateProductionLineCode(code: string, excludeId?: string) {
    const where: any = {
      code,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.productionLine.findFirst({
      where,
    });
  }

  async countProductionLinesInMonth(
    tenantId: string,
    year: number,
    month: string,
  ) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);

    return this.prisma.productionLine.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

}
