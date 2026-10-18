import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { RegionRepository } from "./region.repository";
import { RegionDetail, RegionListItem, RegionTree } from "./utils/types";
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { RegionFiltersDto } from "./dto/region-filters.dto";

@Injectable()
export class RegionService {
  constructor(
    private readonly regionRepository: RegionRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listRegions(
    regionFiltersDto: RegionFiltersDto,
  ): Promise<PaginatedResponse<RegionListItem>> {
    return this.regionRepository.findAll(regionFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.regionRepository.dropdown();
  }

  async getRegion(regionId: string): Promise<RegionDetail> {
    return this.checkExistence(regionId);
  }

  async createRegion(createRegionDto: CreateRegionDto): Promise<RegionDetail> {
    const { name, countryName, status } = createRegionDto;

    const payload: Prisma.RegionCreateInput = {
      name,
      countryName,
      ...(status && { status }),
    };

    try {
      return await this.regionRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A region with this name already exists");
    }
  }

  async updateRegion(regionId: string, updateRegionDto: UpdateRegionDto): Promise<RegionDetail> {
    const existingRegion = await this.checkExistence(regionId);

    this.auditContext.setOldValue(existingRegion);
    this.auditContext.setEntityLabel(existingRegion.name);

    const { name, countryName, status } = updateRegionDto;

    const updateData: Prisma.RegionUpdateInput = {
      ...(name !== undefined && { name }),
      ...(countryName !== undefined && { countryName }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.regionRepository.update(regionId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A region with this name already exists");
    }
  }

  async deleteRegion(regionId: string): Promise<void> {
    const existingRegion = await this.checkExistence(regionId);

    if (await this.regionRepository.hasZones(regionId)) {
      throw new BadRequestException("Cannot delete a region that has zones assigned to it");
    }

    this.auditContext.setOldValue(existingRegion);
    this.auditContext.setEntityLabel(existingRegion.name);

    await this.regionRepository.delete(regionId);
  }

  async getRegionTree(regionId: string): Promise<RegionTree> {
    await this.checkExistence(regionId);
    const regionTree = await this.regionRepository.findTreeById(regionId);
    return regionTree as RegionTree;
  }

  async checkExistence(regionId: string): Promise<RegionDetail> {
    const region = await this.regionRepository.findById(regionId);

    if (!region) {
      throw new NotFoundException("Region not found");
    }

    return region;
  }
}
