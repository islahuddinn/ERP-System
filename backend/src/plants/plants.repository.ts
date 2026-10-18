import { Injectable } from "@nestjs/common";
import { CreatePlantDto, UpdatePlantDto, PlantStatus } from "./dto/plant.dto";

@Injectable()
export class PlantsRepository {
  constructor() {}

  async create(tenantClient: any, createDto: CreatePlantDto, userId?: string) {
    // #region agent log
    const fs = require("fs");
    const logPath =
      "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    try {
      const logEntry =
        JSON.stringify({
          location: "plants.repository.ts:8",
          message: "PlantsRepository.create called - attempting DB insert",
          data: {
            dto: createDto,
            dtoKeys: Object.keys(createDto),
            prismaData: {
              ...createDto,
              isActive: true,
              notes: createDto.notes || null,
              address: createDto.address || null,
              contactPhone: createDto.contactPhone || null,
              contactEmail: createDto.contactEmail || null,
              contactPerson: createDto.contactPerson || null,
              description: createDto.description || null,
              createdById: userId || null,
              updatedById: userId || null,
            },
            userId: userId,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "D",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion

    try {
      const result = await tenantClient.plant.create({
        data: {
          ...createDto,
          isActive: true,
          notes: createDto.notes || null,
          address: createDto.address || null,
          contactPhone: createDto.contactPhone || null,
          contactEmail: createDto.contactEmail || null,
          contactPerson: createDto.contactPerson || null,
          description: createDto.description || null,
          createdById: userId || null,
          updatedById: userId || null,
        },
        include: {
          location: true,
        },
      });

      // #region agent log
      try {
        const logEntry =
          JSON.stringify({
            location: "plants.repository.ts:35",
            message: "PlantsRepository.create SUCCESS",
            data: {
              createdPlantId: result.id,
              createdPlantCode: result.code,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }) + "\n";
        fs.appendFileSync(logPath, logEntry, "utf8");
      } catch (e) {}
      // #endregion

      return result;
    } catch (error: any) {
      // #region agent log
      try {
        const logEntry =
          JSON.stringify({
            location: "plants.repository.ts:50",
            message: "PlantsRepository.create FAILED",
            data: {
              errorMessage: error.message,
              errorCode: error.code,
              errorMeta: error.meta,
              errorName: error.name,
              fullError: JSON.stringify(error),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }) + "\n";
        fs.appendFileSync(logPath, logEntry, "utf8");
      } catch (e) {}
      // #endregion
      throw error;
    }
  }

  async findAll(tenantClient: any, filters: any = {}) {
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.plantType && { plantType: filters.plantType }),
      ...(filters.capacity && { capacity: filters.capacity }),
      ...(filters.locationId && { locationId: filters.locationId }),
      ...(filters.managerId && { managerId: filters.managerId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { code: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
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

    const page = filters.page ? parseInt(filters.page) : 1;
    const limit = filters.limit ? parseInt(filters.limit) : 10;
    const skip = (page - 1) * limit;

    const [plants, total] = await Promise.all([
      tenantClient.plant.findMany({
        where,
        include: {
          location: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      tenantClient.plant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: plants,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(tenantClient: any, id: string) {
    return tenantClient.plant.findFirst({
      where: { id },
      include: {
        location: true,
        manager: true,
      },
    });
  }

  async update(
    tenantClient: any,
    id: string,
    updateDto: UpdatePlantDto,
    userId?: string,
  ) {
    return tenantClient.plant.update({
      where: { id },
      data: {
        ...updateDto,
        updatedById: userId || null,
      },
      include: {
        location: true,
        manager: true,
      },
    });
  }

  async remove(tenantClient: any, id: string) {
    return tenantClient.plant.delete({
      where: { id },
    });
  }

  async updateStatus(tenantClient: any, id: string, status: PlantStatus) {
    return tenantClient.plant.update({
      where: { id },
      data: { status },
    });
  }

  async getPlantStats(tenantClient: any, filters: any = {}) {
    const where: any = {};

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    const [
      totalPlants,
      activePlants,
      inactivePlants,
      maintenancePlants,
      underConstructionPlants,
      closedPlants,
    ] = await Promise.all([
      tenantClient.plant.count({ where }),
      tenantClient.plant.count({
        where: { ...where, status: PlantStatus.ACTIVE },
      }),
      tenantClient.plant.count({
        where: { ...where, status: PlantStatus.INACTIVE },
      }),
      tenantClient.plant.count({
        where: { ...where, status: PlantStatus.MAINTENANCE },
      }),
      tenantClient.plant.count({
        where: { ...where, status: PlantStatus.UNDER_CONSTRUCTION },
      }),
      tenantClient.plant.count({
        where: { ...where, status: PlantStatus.CLOSED },
      }),
    ]);

    return {
      totalPlants,
      activePlants,
      inactivePlants,
      maintenancePlants,
      underConstructionPlants,
      closedPlants,
      activeRate: totalPlants > 0 ? (activePlants / totalPlants) * 100 : 0,
    };
  }

  async validateLocation(tenantClient: any, locationId: string) {
    return tenantClient.location.findFirst({
      where: { id: locationId },
    });
  }

  async validateManager(tenantClient: any, managerId: string) {
    return tenantClient.user.findFirst({
      where: { id: managerId },
    });
  }

  async validatePlantCode(tenantClient: any, code: string, excludeId?: string) {
    const where: any = {
      code,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return tenantClient.plant.findFirst({
      where,
    });
  }

  async countPlantsInMonth(tenantClient: any, year: number, month: string) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);

    return tenantClient.plant.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
