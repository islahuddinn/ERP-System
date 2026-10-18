import { Injectable } from "@nestjs/common";
import { ContractAllowance, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AllowanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByContract(contractId: string): Promise<ContractAllowance[]> {
    return this.prisma.contractAllowance.findMany({
      where: { contractId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(contractId: string, allowanceId: string): Promise<ContractAllowance | null> {
    return this.prisma.contractAllowance.findFirst({
      where: { id: allowanceId, contractId },
    });
  }

  async create(data: Prisma.ContractAllowanceUncheckedCreateInput): Promise<ContractAllowance> {
    return this.prisma.contractAllowance.create({ data });
  }

  async update(allowanceId: string, amount: string): Promise<ContractAllowance> {
    return this.prisma.contractAllowance.update({
      where: { id: allowanceId },
      data: { amount },
    });
  }

  async delete(allowanceId: string): Promise<void> {
    await this.prisma.contractAllowance.delete({ where: { id: allowanceId } });
  }
}
