import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { BranchService } from "../branch/branch.service";
import { AreaRepository } from "./area.repository";
import { AreaDetail, AreaListItem, AreaTree } from "./utils/types";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";
import { AreaFiltersDto } from "./dto/area-filters.dto";

@Injectable()
export class AreaService {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly branchService: BranchService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listAreas(areaFiltersDto: AreaFiltersDto): Promise<PaginatedResponse<AreaListItem>> {
    return this.areaRepository.findAll(areaFiltersDto);
  }

  async dropdown(branchId?: string): Promise<{ id: string; name: string; branchId: string }[]> {
    return this.areaRepository.dropdown(branchId);
  }

  async getArea(areaId: string): Promise<AreaDetail> {
    return this.checkExistence(areaId);
  }

  async createArea(createAreaDto: CreateAreaDto): Promise<AreaDetail> {
    const { name, branchId, status } = createAreaDto;

    await this.branchService.checkExistence(branchId);

    const payload: Prisma.AreaCreateInput = {
      name,
      branch: { connect: { id: branchId } },
      ...(status && { status }),
    };

    try {
      return await this.areaRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "An area with this name already exists in this branch");
    }
  }

  async updateArea(areaId: string, updateAreaDto: UpdateAreaDto): Promise<AreaDetail> {
    const existingArea = await this.checkExistence(areaId);

    this.auditContext.setOldValue(existingArea);
    this.auditContext.setEntityLabel(existingArea.name);

    const { name, branchId, status } = updateAreaDto;

    if (branchId) {
      await this.branchService.checkExistence(branchId);
    }

    const updateData: Prisma.AreaUpdateInput = {
      ...(name !== undefined && { name }),
      ...(branchId !== undefined && { branch: { connect: { id: branchId } } }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.areaRepository.update(areaId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "An area with this name already exists in this branch");
    }
  }

  async deleteArea(areaId: string): Promise<void> {
    const existingArea = await this.checkExistence(areaId);

    this.auditContext.setOldValue(existingArea);
    this.auditContext.setEntityLabel(existingArea.name);

    await this.areaRepository.delete(areaId);
  }

  async getAreaTree(areaId: string): Promise<AreaTree> {
    await this.checkExistence(areaId);
    const areaTree = await this.areaRepository.findTreeById(areaId);
    return areaTree as AreaTree;
  }

  async checkExistence(areaId: string): Promise<AreaDetail> {
    const area = await this.areaRepository.findById(areaId);

    if (!area) {
      throw new NotFoundException("Area not found");
    }

    return area;
  }
}
