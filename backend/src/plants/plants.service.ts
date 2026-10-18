import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PlantsRepository } from "./plants.repository";
import { CreatePlantDto, UpdatePlantDto, PlantQueryDto, PlantStatsQueryDto } from "./dto/plant.dto";
import { PrismaClient } from "@prisma/tenant-client";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class PlantsService {
  constructor(
    private readonly plantsRepository: PlantsRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(tenantClient: PrismaClient, createPlantDto: CreatePlantDto, userId?: string) {
    // #region agent log
    const fs = require("fs");
    const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    try {
      const logEntry =
        JSON.stringify({
          location: "plants.service.ts:10",
          message: "PlantsService.create called",
          data: {
            dto: createPlantDto,
            dtoKeys: Object.keys(createPlantDto),
            locationId: createPlantDto.locationId,
            managerId: createPlantDto.managerId,
            userId: userId,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "C",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion

    // 1. Validate location existence
    const location = await this.plantsRepository.validateLocation(
      tenantClient,
      createPlantDto.locationId,
    );

    // #region agent log
    try {
      const logEntry =
        JSON.stringify({
          location: "plants.service.ts:25",
          message: "Location validation result",
          data: {
            locationId: createPlantDto.locationId,
            locationFound: !!location,
            locationData: location ? { id: location.id, name: (location as any).name } : null,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "C",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion

    if (!location) {
      throw new NotFoundException(`Location with ID ${createPlantDto.locationId} not found`);
    }

    // 2. Validate manager existence (if provided)
    if (createPlantDto.managerId) {
      const manager = await this.plantsRepository.validateManager(
        tenantClient,
        createPlantDto.managerId,
      );
      if (!manager) {
        throw new NotFoundException(`Manager with ID ${createPlantDto.managerId} not found`);
      }
    }

    // 3. Check for duplicate plant code
    const existingPlant = await this.plantsRepository.validatePlantCode(
      tenantClient,
      createPlantDto.code,
    );
    if (existingPlant) {
      throw new ConflictException(`Plant with code ${createPlantDto.code} already exists`);
    }

    return this.plantsRepository.create(tenantClient, createPlantDto, userId);
  }

  async findAll(tenantClient: PrismaClient, query: PlantQueryDto) {
    return this.plantsRepository.findAll(tenantClient, query);
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const plant = await this.plantsRepository.findOne(tenantClient, id);
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }
    return plant;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updatePlantDto: UpdatePlantDto,
    userId?: string,
  ) {
    // 1. Check if plant exists
    const existingPlant = await this.plantsRepository.findOne(tenantClient, id);
    if (!existingPlant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    // 2. Validate location (if updating)
    if (updatePlantDto.locationId) {
      const location = await this.plantsRepository.validateLocation(
        tenantClient,
        updatePlantDto.locationId,
      );
      if (!location) {
        throw new NotFoundException(`Location with ID ${updatePlantDto.locationId} not found`);
      }
    }

    // 3. Validate manager (if updating)
    if (updatePlantDto.managerId) {
      const manager = await this.plantsRepository.validateManager(
        tenantClient,
        updatePlantDto.managerId,
      );
      if (!manager) {
        throw new NotFoundException(`Manager with ID ${updatePlantDto.managerId} not found`);
      }
    }

    this.auditContext.setOldValue(existingPlant);
    this.auditContext.setEntityLabel(existingPlant.name);

    return this.plantsRepository.update(tenantClient, id, updatePlantDto, userId);
  }

  async remove(tenantClient: PrismaClient, id: string) {
    const plant = await this.plantsRepository.findOne(tenantClient, id);
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    // Check for production lines
    const productionLines = await tenantClient.productionLine.findMany({
      where: { plantId: id },
    });
    if (productionLines.length > 0) {
      throw new ConflictException("Cannot delete plant with associated production lines");
    }

    // Check for machines (through production lines)
    const machines = await tenantClient.machine.findMany({
      where: { productionLine: { plantId: id } },
    });
    if (machines.length > 0) {
      throw new ConflictException("Cannot delete plant with associated machines");
    }

    // Check for work orders (future-proof)
    // Note: Adjust this query based on your actual work order schema
    const workOrders = await tenantClient.$queryRaw`
            SELECT COUNT(*) as count FROM work_orders WHERE plant_id = ${id}
        `.catch(() => null);

    if (workOrders && (workOrders as any)[0]?.count > 0) {
      throw new ConflictException("Cannot delete plant with associated work orders");
    }

    this.auditContext.setOldValue(plant);
    this.auditContext.setEntityLabel(plant.name);

    return this.plantsRepository.remove(tenantClient, id);
  }

  async getStats(tenantClient: PrismaClient, query: PlantStatsQueryDto) {
    return this.plantsRepository.getPlantStats(tenantClient, query);
  }
}
