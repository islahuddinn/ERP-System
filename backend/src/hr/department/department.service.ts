import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { DepartmentRepository } from "./department.repository";
import { DepartmentDetail, DepartmentWithEmployeeCount } from "./utils/types";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentFiltersDto } from "./dto/department-filters.dto";

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listDepartments(
    departmentFiltersDto: DepartmentFiltersDto,
  ): Promise<PaginatedResponse<DepartmentWithEmployeeCount>> {
    return this.departmentRepository.findAll(departmentFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string; parentDepartmentId: string | null }[]> {
    return this.departmentRepository.dropdown();
  }

  async getDepartmentTree(): Promise<object[]> {
    const departments = await this.departmentRepository.findAllFlat();

    const byId = new Map<string, any>();
    departments.forEach((d) => byId.set(d.id, { ...d, children: [] }));

    const roots: any[] = [];

    for (const dept of departments) {
      const node = byId.get(dept.id);

      if (dept.parentDepartmentId && byId.has(dept.parentDepartmentId)) {
        byId.get(dept.parentDepartmentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getDepartment(departmentId: string): Promise<DepartmentDetail> {
    return this.checkExistence(departmentId);
  }

  async createDepartment(createDepartmentDto: CreateDepartmentDto): Promise<DepartmentDetail> {
    const { name, description, parentDepartmentId } = createDepartmentDto;

    if (parentDepartmentId) {
      await this.checkExistence(parentDepartmentId);
    }

    const payload: Prisma.DepartmentCreateInput = {
      name,
      description: description ?? null,
      ...(parentDepartmentId && {
        parent: { connect: { id: parentDepartmentId } },
      }),
    };

    try {
      return await this.departmentRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A department with this name already exists");
    }
  }

  async updateDepartment(
    departmentId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentDetail> {
    const existingDepartment = await this.checkExistence(departmentId);

    this.auditContext.setOldValue(existingDepartment);
    this.auditContext.setEntityLabel(existingDepartment.name);

    const { name, description, parentDepartmentId } = updateDepartmentDto;

    if (parentDepartmentId === departmentId) {
      throw new BadRequestException("Department cannot be its own parent");
    }

    if (parentDepartmentId) {
      await this.checkExistence(parentDepartmentId);
    }

    const updateData: Prisma.DepartmentUpdateInput = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(parentDepartmentId !== undefined && {
        parent: parentDepartmentId ? { connect: { id: parentDepartmentId } } : { disconnect: true },
      }),
    };

    try {
      return await this.departmentRepository.update(departmentId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A department with this name already exists");
    }
  }

  async deleteDepartment(departmentId: string): Promise<void> {
    const existingDepartment = await this.checkExistence(departmentId);

    if (await this.departmentRepository.hasEmployees(departmentId)) {
      throw new BadRequestException("Cannot delete a department that has employees assigned to it");
    }

    if (await this.departmentRepository.hasChildren(departmentId)) {
      throw new BadRequestException(
        "Cannot delete a department that has sub-departments. Reassign or delete them first",
      );
    }

    this.auditContext.setOldValue(existingDepartment);
    this.auditContext.setEntityLabel(existingDepartment.name);

    await this.departmentRepository.delete(departmentId);
  }

  async checkExistence(departmentId: string): Promise<DepartmentDetail> {
    const department = await this.departmentRepository.findById(departmentId);

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }
}
