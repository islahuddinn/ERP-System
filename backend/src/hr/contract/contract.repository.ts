import { Injectable } from "@nestjs/common";
import {
  ContractStatus,
  EmployeeContract,
  Prisma,
  SalaryRevisionStatus,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ContractFiltersDto } from "./dto/contract-filters.dto";
import { CONTRACT_DETAIL_INCLUDE, CONTRACT_LIST_INCLUDE } from "./utils/constants";
import { ContractDetail, ContractListItem } from "./utils/types";

// Whitelist of columns the Contracts list can be sorted by. Relation columns
// use dot-notation (folded into Prisma's nested shape by buildOrderBy); anything
// not in this list falls back to `createdAt desc` so an arbitrary sortBy value
// can never reach Prisma and blow up with a validation error (500).
const CONTRACT_SORTABLE_FIELDS = [
  "contractType",
  "status",
  "startDate",
  "endDate",
  "probationEndDate",
  "totalLeaves",
  "currentSalary",
  "createdAt",
  "updatedAt",
  "employee.employeeCode",
  "employee.user.firstName",
  "employee.user.lastName",
  "department.name",
  "position.title",
];

@Injectable()
export class ContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    contractFiltersDto: ContractFiltersDto,
  ): Promise<PaginatedResponse<ContractListItem>> {
    const {
      employeeId,
      status,
      contractType,
      departmentId,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
      search,
    } = contractFiltersDto;

    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.EmployeeContractWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (contractType) where.contractType = contractType;
    if (departmentId) where.departmentId = departmentId;

    // Search by employee code or the employee's full name / email (via the user
    // relation). A multi-word query like "John Doe" is split into terms so each
    // term must match the first name, last name or email — this lets a full name
    // match even though first and last name live in separate columns (#9). A
    // single-word query still matches any one of those fields.
    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);
      where.employee = {
        OR: [
          ...buildSearchFilter(search, ["employeeCode"]),
          {
            user: {
              AND: searchTerms.map((term) => ({
                OR: buildSearchFilter(term, ["firstName", "lastName", "email"]),
              })),
            },
          },
        ],
      };
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && CONTRACT_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.employeeContract.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CONTRACT_LIST_INCLUDE,
      }),

      this.prisma.employeeContract.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(contractId: string): Promise<ContractDetail | null> {
    return this.fetchDetail(this.prisma, contractId);
  }

  private fetchDetail(
    tx: Prisma.TransactionClient,
    contractId: string,
  ): Promise<ContractDetail | null> {
    return tx.employeeContract.findUnique({
      where: { id: contractId },
      include: CONTRACT_DETAIL_INCLUDE,
    });
  }

  async findActiveByEmployee(employeeId: string): Promise<EmployeeContract | null> {
    return this.prisma.employeeContract.findFirst({
      where: { employeeId, status: ContractStatus.ACTIVE },
    });
  }

  async create(data: Prisma.EmployeeContractUncheckedCreateInput): Promise<ContractDetail> {
    return this.prisma.employeeContract.create({
      data,
      include: CONTRACT_DETAIL_INCLUDE,
    });
  }

  async update(
    contractId: string,
    data: Prisma.EmployeeContractUncheckedUpdateInput,
  ): Promise<ContractDetail> {
    return this.prisma.employeeContract.update({
      where: { id: contractId },
      data,
      include: CONTRACT_DETAIL_INCLUDE,
    });
  }

  async terminate(contractId: string, notes?: string): Promise<ContractDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.salaryRevision.updateMany({
        where: {
          contractId,
          status: { in: [SalaryRevisionStatus.DRAFT, SalaryRevisionStatus.CURRENT] },
        },
        data: { status: SalaryRevisionStatus.SUSPENDED },
      });

      return tx.employeeContract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.TERMINATED,
          ...(notes !== undefined && { notes }),
        },
        include: CONTRACT_DETAIL_INCLUDE,
      });
    });
  }

  async createWithRevision(
    contractData: Prisma.EmployeeContractUncheckedCreateInput,
    salaryRevisionPayload: Omit<Prisma.SalaryRevisionUncheckedCreateInput, "contractId">,
  ): Promise<ContractDetail> {
    return this.prisma.$transaction(async (tx) => {
      // Denormalize the initial base salary onto the contract so the list can sort by it (#1).
      const contract = await tx.employeeContract.create({
        data: { ...contractData, currentSalary: salaryRevisionPayload.baseSalary },
      });

      await tx.salaryRevision.create({
        data: { ...salaryRevisionPayload, contractId: contract.id },
      });

      const result = await this.fetchDetail(tx, contract.id);

      return result!;
    });
  }

  async activateContract(
    contractId: string,
    currentActive?: EmployeeContract,
  ): Promise<ContractDetail> {
    return this.prisma.$transaction(async (tx) => {
      /**
       * While Activating new Contract
       * - Mark the previous contract as Expired (replaced by the new one)
       */
      if (currentActive) {
        await tx.employeeContract.update({
          where: { id: currentActive.id },
          data: { status: ContractStatus.EXPIRED },
        });

        await tx.salaryRevision.updateMany({
          where: { contractId: currentActive.id, status: SalaryRevisionStatus.CURRENT },
          data: { status: SalaryRevisionStatus.SUPERSEDED },
        });
      }

      /**
       * Find One Draft Salary Revision and Activate that one
       */
      const draft = await tx.salaryRevision.findFirst({
        where: { contractId, status: SalaryRevisionStatus.DRAFT },
      });

      if (draft) {
        await tx.salaryRevision.update({
          where: { id: draft.id },
          data: { status: SalaryRevisionStatus.CURRENT },
        });
        // Keep the denormalized contract.currentSalary in sync (#1).
        await tx.employeeContract.update({
          where: { id: contractId },
          data: { currentSalary: draft.baseSalary },
        });
      }

      /**
       * Update (Active) new Contract
       */
      return tx.employeeContract.update({
        where: { id: contractId },
        data: { status: ContractStatus.ACTIVE },
        include: CONTRACT_DETAIL_INCLUDE,
      });
    });
  }

  async setStatus(contractId: string, status: ContractStatus): Promise<void> {
    await this.prisma.employeeContract.update({
      where: { id: contractId },
      data: { status },
    });
  }
}
