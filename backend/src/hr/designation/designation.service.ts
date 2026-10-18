import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { DesignationRepository } from "./designation.repository";
import { DesignationDetail, DesignationWithEmployeeCount } from "./utils/types";
import { CreateDesignationDto } from "./dto/create-designation.dto";
import { UpdateDesignationDto } from "./dto/update-designation.dto";
import { DesignationFiltersDto } from "./dto/designation-filters.dto";

@Injectable()
export class DesignationService {
  constructor(
    private readonly designationRepository: DesignationRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listDesignations(
    designationFiltersDto: DesignationFiltersDto,
  ): Promise<PaginatedResponse<DesignationWithEmployeeCount>> {
    return this.designationRepository.findAll(designationFiltersDto);
  }

  async dropdown(): Promise<{ id: string; title: string; parentDesignationId: string | null }[]> {
    return this.designationRepository.dropdown();
  }

  async getDesignationTree(): Promise<object[]> {
    const designations = await this.designationRepository.findAllFlat();

    const byId = new Map<string, any>();
    designations.forEach((designation) =>
      byId.set(designation.id, { ...designation, children: [] }),
    );

    const roots: any[] = [];

    for (const designation of designations) {
      const node = byId.get(designation.id);

      if (designation.parentDesignationId && byId.has(designation.parentDesignationId)) {
        byId.get(designation.parentDesignationId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getDesignation(designationId: string): Promise<DesignationDetail> {
    return this.checkExistence(designationId);
  }

  async createDesignation(createDesignationDto: CreateDesignationDto): Promise<DesignationDetail> {
    const { title, description, parentDesignationId } = createDesignationDto;

    if (parentDesignationId) {
      await this.checkExistence(parentDesignationId);
    }

    const payload: Prisma.DesignationCreateInput = {
      title,
      description: description ?? null,
      ...(parentDesignationId && {
        parent: { connect: { id: parentDesignationId } },
      }),
    };

    try {
      return await this.designationRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A designation with this title already exists");
    }
  }

  async updateDesignation(
    designationId: string,
    updateDesignationDto: UpdateDesignationDto,
  ): Promise<DesignationDetail> {
    const existingDesignation = await this.checkExistence(designationId);

    this.auditContext.setOldValue(existingDesignation);
    this.auditContext.setEntityLabel(existingDesignation.title);

    const { title, description, parentDesignationId } = updateDesignationDto;

    if (parentDesignationId === designationId) {
      throw new BadRequestException("Designation cannot be its own parent");
    }

    if (parentDesignationId) {
      await this.checkExistence(parentDesignationId);
    }

    const updateData: Prisma.DesignationUpdateInput = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(parentDesignationId !== undefined && {
        parent: parentDesignationId
          ? { connect: { id: parentDesignationId } }
          : { disconnect: true },
      }),
    };

    try {
      return await this.designationRepository.update(designationId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A designation with this title already exists");
    }
  }

  async deleteDesignation(designationId: string): Promise<void> {
    const existingDesignation = await this.checkExistence(designationId);

    if (await this.designationRepository.hasEmployees(designationId)) {
      throw new BadRequestException(
        "Cannot delete a designation that has employees assigned to it",
      );
    }

    if (await this.designationRepository.hasChildren(designationId)) {
      throw new BadRequestException(
        "Cannot delete a designation that has sub-designations. Reassign or delete them first",
      );
    }

    this.auditContext.setOldValue(existingDesignation);
    this.auditContext.setEntityLabel(existingDesignation.title);

    await this.designationRepository.delete(designationId);
  }

  async checkExistence(designationId: string): Promise<DesignationDetail> {
    const designation = await this.designationRepository.findById(designationId);

    if (!designation) {
      throw new NotFoundException("Designation not found");
    }

    return designation;
  }
}
