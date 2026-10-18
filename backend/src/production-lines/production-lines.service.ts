import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ProductionLinesRepository } from "./production-lines.repository";
import {
  CreateProductionLineDto,
  UpdateProductionLineDto,
  ProductionLineStatus,
} from "./dto/production-line.dto";
import { AuditContextService } from "../audit/audit-context.service";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class ProductionLinesService {
  constructor(
    private readonly productionLinesRepository: ProductionLinesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(
    tenantClient: PrismaClient,
    createDto: CreateProductionLineDto,
    tenantId: string,
    userId: string,
  ) {
    // Validate plant exists
    const plant = await this.productionLinesRepository.validatePlant(createDto.plantId);
    if (!plant) {
      throw new BadRequestException("Plant not found");
    }

    // Validate supervisor if provided
    if (createDto.supervisorId) {
      const supervisor = await this.productionLinesRepository.validateSupervisor(
        createDto.supervisorId,
      );
      if (!supervisor) {
        throw new BadRequestException("Supervisor not found");
      }
    }

    // Validate production line code uniqueness
    const existingLine = await this.productionLinesRepository.validateProductionLineCode(
      createDto.code,
    );
    if (existingLine) {
      throw new BadRequestException("Production line code already exists");
    }

    const productionLine = await this.productionLinesRepository.create(createDto, tenantId);

    return productionLine;
  }

  async findAll(tenantId: string, filters: any) {
    return this.productionLinesRepository.findAll(tenantId, filters);
  }

  async findOne(id: string, tenantId: string) {
    const productionLine = await this.productionLinesRepository.findOne(id, tenantId);
    if (!productionLine) {
      throw new NotFoundException("Production line not found");
    }
    return productionLine;
  }

  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateProductionLineDto,
    tenantId: string,
    userId: string,
  ) {
    const existingLine = await this.findOne(id, tenantId);

    // Validate status transitions
    if (updateDto.status && !this.isValidStatusTransition(existingLine.status, updateDto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${existingLine.status} to ${updateDto.status}`,
      );
    }

    this.auditContext.setOldValue(existingLine);
    this.auditContext.setEntityLabel(existingLine.name ?? existingLine.code);

    const updatedLine = await this.productionLinesRepository.update(id, updateDto, tenantId);

    return updatedLine;
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string, userId: string) {
    const existingLine = await this.findOne(id, tenantId);

    // Only allow deletion of lines in INACTIVE status
    if (existingLine.status !== ProductionLineStatus.INACTIVE) {
      throw new BadRequestException("Can only delete production lines in INACTIVE status");
    }

    this.auditContext.setOldValue(existingLine);
    this.auditContext.setEntityLabel(existingLine.name ?? existingLine.code);

    await this.productionLinesRepository.remove(id, tenantId);
  }

  async updateStatus(
    tenantClient: PrismaClient,
    id: string,
    status: ProductionLineStatus,
    tenantId: string,
    userId: string,
  ) {
    const existingLine = await this.findOne(id, tenantId);

    // Validate status transitions
    if (!this.isValidStatusTransition(existingLine.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${existingLine.status} to ${status}`,
      );
    }

    this.auditContext.setOldValue(existingLine);
    this.auditContext.setEntityLabel(existingLine.name ?? existingLine.code);

    const updatedLine = await this.productionLinesRepository.updateStatus(id, status, tenantId);

    return updatedLine;
  }

  async updateLoad(
    tenantClient: PrismaClient,
    id: string,
    currentLoad: number,
    tenantId: string,
    userId: string,
  ) {
    const existingLine = await this.findOne(id, tenantId);

    // Validate load doesn't exceed capacity
    if (currentLoad > existingLine.capacity) {
      throw new BadRequestException(
        `Current load (${currentLoad}) cannot exceed capacity (${existingLine.capacity})`,
      );
    }

    this.auditContext.setOldValue(existingLine);
    this.auditContext.setEntityLabel(existingLine.name ?? existingLine.code);

    const updatedLine = await this.productionLinesRepository.updateLoad(id, currentLoad, tenantId);

    return updatedLine;
  }

  async getProductionLineStats(tenantId: string, filters: any = {}) {
    return this.productionLinesRepository.getProductionLineStats(tenantId, filters);
  }

  private isValidStatusTransition(currentStatus: any, newStatus: ProductionLineStatus): boolean {
    const current = String(currentStatus);
    const validTransitions = {
      [ProductionLineStatus.ACTIVE]: [
        ProductionLineStatus.INACTIVE,
        ProductionLineStatus.MAINTENANCE,
        ProductionLineStatus.UNDER_REPAIR,
        ProductionLineStatus.DECOMMISSIONED,
      ],
      [ProductionLineStatus.INACTIVE]: [ProductionLineStatus.ACTIVE],
      [ProductionLineStatus.MAINTENANCE]: [
        ProductionLineStatus.ACTIVE,
        ProductionLineStatus.UNDER_REPAIR,
      ],
      [ProductionLineStatus.UNDER_REPAIR]: [
        ProductionLineStatus.MAINTENANCE,
        ProductionLineStatus.ACTIVE,
      ],
      [ProductionLineStatus.DECOMMISSIONED]: [], // Terminal state
    };

    return (validTransitions as any)[current]?.includes(newStatus) ?? false;
  }
}
