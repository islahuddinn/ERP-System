import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { MachinesRepository } from "./machines.repository";
import {
  CreateMachineDto,
  UpdateMachineDto,
  MachineQueryDto,
  MachineStatsQueryDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceStatus,
  MachineStatus,
} from "./dto/machine.dto";
import { AuditContextService } from "../audit/audit-context.service";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class MachinesService {
  constructor(
    private readonly machinesRepository: MachinesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(
    tenantClient: PrismaClient,
    createDto: CreateMachineDto,
    tenantId: string,
    userId: string,
  ) {
    // 1. Validate plant
    const plant = await this.machinesRepository.validatePlant(createDto.plantId, tenantId);
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${createDto.plantId} not found`);
    }

    // 2. Validate production line (optional)
    if (createDto.productionLineId) {
      const line = await this.machinesRepository.validateProductionLine(
        createDto.productionLineId,
        tenantId,
      );
      if (!line) {
        throw new NotFoundException(
          `Production Line with ID ${createDto.productionLineId} not found`,
        );
      }
    }

    // 3. Validate supervisor (optional)
    if (createDto.supervisorId) {
      const supervisor = await this.machinesRepository.validateSupervisor(
        createDto.supervisorId,
        tenantId,
      );
      if (!supervisor) {
        throw new NotFoundException(`Supervisor with ID ${createDto.supervisorId} not found`);
      }
    }

    // 4. Check uniqueness
    const existing = await this.machinesRepository.validateMachineCode(createDto.code, tenantId);
    if (existing) {
      throw new ConflictException(`Machine with code ${createDto.code} already exists`);
    }

    const machine = await this.machinesRepository.create(createDto, tenantId);

    return machine;
  }

  async findAll(tenantClient: PrismaClient, tenantId: string, query: MachineQueryDto) {
    return this.machinesRepository.findAll(tenantClient, tenantId, query);
  }

  async findOne(id: string, tenantId: string) {
    const machine = await this.machinesRepository.findOne(id, tenantId);
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    return machine;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateMachineDto,
    tenantId: string,
    userId: string,
  ) {
    const existing = await this.findOne(id, tenantId);

    // Validate relationships if changing
    if (updateDto.plantId) {
      const plant = await this.machinesRepository.validatePlant(updateDto.plantId, tenantId);
      if (!plant) throw new NotFoundException(`Plant not found`);
    }
    if (updateDto.productionLineId) {
      const line = await this.machinesRepository.validateProductionLine(
        updateDto.productionLineId,
        tenantId,
      );
      if (!line) throw new NotFoundException(`Production Line not found`);
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name ?? existing.code);

    const updated = await this.machinesRepository.update(id, updateDto, tenantId);

    return updated;
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string, userId: string) {
    const existing = await this.findOne(id, tenantId);

    // Only allow deletion if inactive/decommissioned? (Logic similar to ProdLine)
    // Assume we can soft delete or strict delete check
    if (
      existing.status !== MachineStatus.INACTIVE &&
      existing.status !== MachineStatus.DECOMMISSIONED
    ) {
      throw new BadRequestException(
        "Cannot delete active machine. Please decommission or deactivate first.",
      );
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name ?? existing.code);

    await this.machinesRepository.remove(id, tenantId);
  }

  async updateStatus(
    tenantClient: PrismaClient,
    id: string,
    status: MachineStatus,
    tenantId: string,
    userId: string,
  ) {
    const existing = await this.findOne(id, tenantId);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name ?? existing.code);

    const updated = await this.machinesRepository.updateStatus(id, status, tenantId);

    return updated;
  }

  async getStats(tenantId: string, query: MachineStatsQueryDto) {
    return this.machinesRepository.getMachineStats(tenantId, query);
  }

  // Maintenance
  async createMaintenance(
    tenantClient: PrismaClient,
    createDto: CreateMaintenanceDto,
    tenantId: string,
    userId: string,
  ) {
    // Validate machine
    const machine = await this.findOne(createDto.machineId, tenantId);

    const record = await this.machinesRepository.createMaintenance(createDto, tenantId);

    return record;
  }

  async updateMaintenance(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateMaintenanceDto,
    tenantId: string,
    userId: string,
  ) {
    const existing = await this.machinesRepository.findMaintenanceById(id, tenantId);
    if (existing) {
      this.auditContext.setOldValue(existing);
      this.auditContext.setEntityLabel(existing.title);
    }

    const updated = await this.machinesRepository.updateMaintenance(id, updateDto, tenantId);
    return updated;
  }

  async updateMaintenanceStatus(
    tenantClient: PrismaClient,
    id: string,
    status: MaintenanceStatus,
    tenantId: string,
    userId: string,
  ) {
    const existing = await this.machinesRepository.findMaintenanceById(id, tenantId);
    if (existing) {
      this.auditContext.setOldValue(existing);
      this.auditContext.setEntityLabel(existing.title);
    }

    const updated = await this.machinesRepository.updateMaintenanceStatus(id, status, tenantId);
    return updated;
  }

  async getMaintenanceStats(tenantId: string, machineId?: string) {
    return this.machinesRepository.getMaintenanceStats(tenantId, machineId);
  }

  async getUpcomingMaintenance(tenantId: string, days?: number) {
    return this.machinesRepository.getUpcomingMaintenance(tenantId, days);
  }
}
