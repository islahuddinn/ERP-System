import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateMachineDto,
  UpdateMachineDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MachineStatus,
  MaintenanceStatus,
} from "./dto/machine.dto";

@Injectable()
export class MachinesRepository {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateMachineDto, tenantId: string) {
    return this.prisma.machine.create({
      data: {
        ...createDto,
        tenantId,
        notes: createDto.notes || null,
        description: createDto.description || null,
        location: createDto.location || null,
        operatingHours: createDto.operatingHours || null,
        capacity: createDto.capacity || null,
        efficiency: createDto.efficiency || 0,
        purchaseDate: createDto.purchaseDate ? new Date(createDto.purchaseDate) : null,
        installationDate: createDto.installationDate ? new Date(createDto.installationDate) : null,
        warrantyExpiryDate: createDto.warrantyExpiryDate
          ? new Date(createDto.warrantyExpiryDate)
          : null,
        manufacturer: createDto.manufacturer || null,
        model: createDto.model || null,
        serialNumber: createDto.serialNumber || null,
        departments: createDto.departments || [],
        certifications: createDto.certifications || [],
        components: createDto.components || [],
      },
      include: {
        plant: true,
        productionLine: true,
        maintenanceRecords: {
          orderBy: {
            scheduledDate: "desc",
          },
        },
      },
    });
  }

  async findAll(tenantClient: any, tenantId: string, filters: any = {}) {
    const where = {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.machineType && { machineType: filters.machineType }),
      ...(filters.plantId && { plantId: filters.plantId }),
      ...(filters.productionLineId && {
        productionLineId: filters.productionLineId,
      }),
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

    const [machines, total] = await Promise.all([
      tenantClient.machine.findMany({
        where,
        include: {
          plant: true,
          productionLine: true,
          maintenanceRecords: {
            select: {
              id: true,
              title: true,
              status: true,
              scheduledDate: true,
              maintenanceType: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: filters.page ? (parseInt(filters.page) - 1) * parseInt(filters.limit || "10") : 0,
        take: parseInt(filters.limit || "10"),
      }),
      tenantClient.machine.count({ where }),
    ]);

    return { machines, total };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.machine.findFirst({
      where: { id, tenantId },
      include: {
        plant: true,
        productionLine: true,
        maintenanceRecords: {
          orderBy: {
            scheduledDate: "desc",
          },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdateMachineDto, tenantId: string) {
    return this.prisma.machine.update({
      where: { id, tenantId },
      data: updateDto,
      include: {
        plant: true,
        productionLine: true,
        maintenanceRecords: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledDate: true,
            maintenanceType: true,
          },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    return this.prisma.machine.delete({
      where: { id, tenantId },
    });
  }

  async updateStatus(id: string, status: MachineStatus, tenantId: string) {
    return this.prisma.machine.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  // Maintenance Records
  async createMaintenance(createDto: CreateMaintenanceDto, tenantId: string) {
    return this.prisma.maintenanceRecord.create({
      data: {
        ...createDto,
        tenantId,
        scheduledDate: new Date(createDto.scheduledDate),
        notes: createDto.notes || null,
        description: createDto.description || null,
        requiredParts: createDto.requiredParts || [],
      },
      include: {
        machine: true,
      },
    });
  }

  async findMaintenanceById(id: string, tenantId: string) {
    return this.prisma.maintenanceRecord.findFirst({
      where: { id, tenantId },
      include: {
        machine: true,
      },
    });
  }

  async updateMaintenance(id: string, updateDto: UpdateMaintenanceDto, tenantId: string) {
    return this.prisma.maintenanceRecord.update({
      where: { id, tenantId },
      data: {
        ...updateDto,
        scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
      },
      include: {
        machine: true,
      },
    });
  }

  async updateMaintenanceStatus(
    id: string,
    status: MaintenanceStatus,
    tenantId: string,
    actualDuration?: number,
    actualCost?: number,
  ) {
    const updateData: any = { status };

    if (status === MaintenanceStatus.IN_PROGRESS) {
      updateData.startDate = new Date();
    } else if (status === MaintenanceStatus.COMPLETED) {
      updateData.completedDate = new Date();
      if (actualDuration !== undefined) updateData.actualDuration = actualDuration;
      if (actualCost !== undefined) updateData.actualCost = actualCost;
    }

    return this.prisma.maintenanceRecord.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        machine: true,
      },
    });
  }

  async getMachineStats(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };

    if (filters.plantId) {
      where.plantId = filters.plantId;
    }

    if (filters.productionLineId) {
      where.productionLineId = filters.productionLineId;
    }

    if (filters.supervisorId) {
      where.supervisorId = filters.supervisorId;
    }

    const [
      totalMachines,
      activeMachines,
      inactiveMachines,
      maintenanceMachines,
      underRepairMachines,
      outOfServiceMachines,
      decommissionedMachines,
    ] = await Promise.all([
      this.prisma.machine.count({ where }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.ACTIVE },
      }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.INACTIVE },
      }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.MAINTENANCE },
      }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.UNDER_REPAIR },
      }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.OUT_OF_SERVICE },
      }),
      this.prisma.machine.count({
        where: { ...where, status: MachineStatus.DECOMMISSIONED },
      }),
    ]);

    return {
      totalMachines,
      activeMachines,
      inactiveMachines,
      maintenanceMachines,
      underRepairMachines,
      outOfServiceMachines,
      decommissionedMachines,
      activeRate: totalMachines > 0 ? (activeMachines / totalMachines) * 100 : 0,
    };
  }

  async getMaintenanceStats(tenantId: string, machineId?: string) {
    const where: any = { tenantId };

    if (machineId) {
      where.machineId = machineId;
    }

    const [
      totalMaintenance,
      scheduledMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      cancelledMaintenance,
      overdueMaintenance,
    ] = await Promise.all([
      this.prisma.maintenanceRecord.count({ where }),
      this.prisma.maintenanceRecord.count({
        where: { ...where, status: MaintenanceStatus.SCHEDULED },
      }),
      this.prisma.maintenanceRecord.count({
        where: { ...where, status: MaintenanceStatus.IN_PROGRESS },
      }),
      this.prisma.maintenanceRecord.count({
        where: { ...where, status: MaintenanceStatus.COMPLETED },
      }),
      this.prisma.maintenanceRecord.count({
        where: { ...where, status: MaintenanceStatus.CANCELLED },
      }),
      this.prisma.maintenanceRecord.count({
        where: {
          ...where,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      totalMaintenance,
      scheduledMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      cancelledMaintenance,
      overdueMaintenance,
      completionRate: totalMaintenance > 0 ? (completedMaintenance / totalMaintenance) * 100 : 0,
    };
  }

  async validatePlant(plantId: string, tenantId: string) {
    return this.prisma.plant.findFirst({
      where: { id: plantId },
    });
  }

  async validateProductionLine(productionLineId: string, tenantId: string) {
    return this.prisma.productionLine.findFirst({
      where: { id: productionLineId, tenantId },
    });
  }

  async validateSupervisor(supervisorId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id: supervisorId },
    });
  }

  async validateMachineCode(code: string, tenantId: string, excludeId?: string) {
    const where: any = {
      code,
      tenantId,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.machine.findFirst({
      where,
    });
  }

  async countMachinesInMonth(tenantId: string, year: number, month: string) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);

    return this.prisma.machine.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  async getUpcomingMaintenance(tenantId: string, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.maintenanceRecord.findMany({
      where: {
        tenantId,
        status: MaintenanceStatus.SCHEDULED,
        scheduledDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: {
        machine: true,
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });
  }
}
