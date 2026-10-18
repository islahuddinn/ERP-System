import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { RegionService } from "../region/region.service";
import { ZoneRepository } from "./zone.repository";
import { ZoneDetail, ZoneListItem, ZoneTree } from "./utils/types";
import { CreateSalesZoneDto } from "./dto/create-zone.dto";
import { UpdateSalesZoneDto } from "./dto/update-zone.dto";
import { ZoneFiltersDto } from "./dto/zone-filters.dto";

@Injectable()
export class ZoneService {
  constructor(
    private readonly zoneRepository: ZoneRepository,
    private readonly regionService: RegionService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listZones(zoneFiltersDto: ZoneFiltersDto): Promise<PaginatedResponse<ZoneListItem>> {
    return this.zoneRepository.findAll(zoneFiltersDto);
  }

  async dropdown(regionId?: string): Promise<{ id: string; name: string; regionId: string }[]> {
    return this.zoneRepository.dropdown(regionId);
  }

  async getZone(zoneId: string): Promise<ZoneDetail> {
    return this.checkExistence(zoneId);
  }

  async createZone(createZoneDto: CreateSalesZoneDto): Promise<ZoneDetail> {
    const { name, regionId, status } = createZoneDto;

    await this.regionService.checkExistence(regionId);

    const payload: Prisma.ZoneCreateInput = {
      name,
      region: { connect: { id: regionId } },
      ...(status && { status }),
    };

    try {
      return await this.zoneRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A zone with this name already exists in this region");
    }
  }

  async updateZone(zoneId: string, updateZoneDto: UpdateSalesZoneDto): Promise<ZoneDetail> {
    const existingZone = await this.checkExistence(zoneId);

    this.auditContext.setOldValue(existingZone);
    this.auditContext.setEntityLabel(existingZone.name);

    const { name, regionId, status } = updateZoneDto;

    if (regionId) {
      await this.regionService.checkExistence(regionId);
    }

    const updateData: Prisma.ZoneUpdateInput = {
      ...(name !== undefined && { name }),
      ...(regionId !== undefined && { region: { connect: { id: regionId } } }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.zoneRepository.update(zoneId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A zone with this name already exists in this region");
    }
  }

  async deleteZone(zoneId: string): Promise<void> {
    const existingZone = await this.checkExistence(zoneId);

    if (await this.zoneRepository.hasCities(zoneId)) {
      throw new BadRequestException("Cannot delete a zone that has cities assigned to it");
    }

    this.auditContext.setOldValue(existingZone);
    this.auditContext.setEntityLabel(existingZone.name);

    await this.zoneRepository.delete(zoneId);
  }

  async getZoneTree(zoneId: string): Promise<ZoneTree> {
    await this.checkExistence(zoneId);
    const zoneTree = await this.zoneRepository.findTreeById(zoneId);
    return zoneTree as ZoneTree;
  }

  async checkExistence(zoneId: string): Promise<ZoneDetail> {
    const zone = await this.zoneRepository.findById(zoneId);

    if (!zone) {
      throw new NotFoundException("Zone not found");
    }

    return zone;
  }
}
