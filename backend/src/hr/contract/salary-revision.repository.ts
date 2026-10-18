import { Injectable } from "@nestjs/common";
import { Prisma, SalaryRevision, SalaryRevisionStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { SALARY_REVISION_INCLUDE } from "./utils/constants";
import { SalaryRevisionWithCreator } from "./utils/types";

@Injectable()
export class SalaryRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByContract(contractId: string): Promise<SalaryRevisionWithCreator[]> {
    return this.prisma.salaryRevision.findMany({
      where: { contractId },
      include: SALARY_REVISION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findCurrentByContract(contractId: string): Promise<SalaryRevision | null> {
    return this.prisma.salaryRevision.findFirst({
      where: { contractId, status: SalaryRevisionStatus.CURRENT },
    });
  }

  async findDraftById(revisionId: string): Promise<SalaryRevision | null> {
    return this.prisma.salaryRevision.findFirst({
      where: { id: revisionId, status: SalaryRevisionStatus.DRAFT },
    });
  }

  async findDraftByContract(contractId: string): Promise<SalaryRevision | null> {
    return this.prisma.salaryRevision.findFirst({
      where: { contractId, status: SalaryRevisionStatus.DRAFT },
    });
  }

  async create(data: Prisma.SalaryRevisionUncheckedCreateInput): Promise<SalaryRevision> {
    return this.prisma.salaryRevision.create({ data });
  }

  async activateRevision(contractId: string, revisionId: string): Promise<SalaryRevision> {
    return this.prisma.$transaction(async (tx) => {
      await tx.salaryRevision.updateMany({
        where: { contractId, status: SalaryRevisionStatus.CURRENT },
        data: { status: SalaryRevisionStatus.SUPERSEDED },
      });

      const activated = await tx.salaryRevision.update({
        where: { id: revisionId },
        data: { status: SalaryRevisionStatus.CURRENT },
      });

      // Keep the denormalized contract.currentSalary in sync so the list sorts correctly (#1).
      await tx.employeeContract.update({
        where: { id: contractId },
        data: { currentSalary: activated.baseSalary },
      });

      return activated;
    });
  }
}
