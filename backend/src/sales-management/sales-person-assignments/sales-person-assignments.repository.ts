import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { SalesPersonAssignmentFiltersDto } from "./dto/sales-person-assignment-filters.dto";
import { SALES_PERSON_ASSIGNMENT_INCLUDE } from "./utils/constants";
import { SalesPersonAssignmentDetail } from "./utils/types";

@Injectable()
export class SalesPersonAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    salesPersonAssignmentFiltersDto: SalesPersonAssignmentFiltersDto,
  ): Promise<PaginatedResponse<SalesPersonAssignmentDetail>> {
    const { branchId, page = 1, limit = 10 } = salesPersonAssignmentFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.SalesPersonAssignmentWhereInput = { ...(branchId && { branchId }) };

    const [data, total] = await Promise.all([
      this.prisma.salesPersonAssignment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: SALES_PERSON_ASSIGNMENT_INCLUDE,
      }),
      this.prisma.salesPersonAssignment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findByEmployeeId(employeeId: string): Promise<SalesPersonAssignmentDetail | null> {
    return this.prisma.salesPersonAssignment.findUnique({
      where: { employeeId },
      include: SALES_PERSON_ASSIGNMENT_INCLUDE,
    });
  }

  // employeeId is unique, so assigning someone already assigned elsewhere
  // simply moves them — no separate unassign-then-reassign step needed.
  async assign(employeeId: string, branchId: string): Promise<SalesPersonAssignmentDetail> {
    return this.prisma.salesPersonAssignment.upsert({
      where: { employeeId },
      create: { employeeId, branchId },
      update: { branchId },
      include: SALES_PERSON_ASSIGNMENT_INCLUDE,
    });
  }

  async unassign(employeeId: string): Promise<void> {
    await this.prisma.salesPersonAssignment.delete({ where: { employeeId } });
  }
}
