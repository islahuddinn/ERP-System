import { Injectable } from "@nestjs/common";
import {
  CustomerLedgerEntryType,
  EmployeeCashLedgerEntryType,
  PaymentMethod,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { CustomerRecoveryFiltersDto } from "./dto/customer-recovery-filters.dto";
import {
  CUSTOMER_RECOVERY_DETAIL_INCLUDE,
  CUSTOMER_RECOVERY_LIST_INCLUDE,
} from "./utils/constants";
import { CustomerRecoveryDetail } from "./utils/types";

const CUSTOMER_RECOVERY_SORTABLE_FIELDS = ["collectedAt", "createdAt", "amount"];

export interface CreateCustomerRecoveryData {
  customerId: string;
  salesPersonId: string;
  amount: number;
  paymentMode: PaymentMethod;
  notes: string | null;
  createdById: string;
}

@Injectable()
export class CustomerRecoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerRecoveryFiltersDto: CustomerRecoveryFiltersDto,
  ): Promise<PaginatedResponse<CustomerRecoveryDetail>> {
    const {
      customerId,
      salesPersonId,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = customerRecoveryFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerRecoveryWhereInput = {
      ...(customerId && { customerId }),
      ...(salesPersonId && { salesPersonId }),
    };

    const orderBy =
      sortBy && CUSTOMER_RECOVERY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { collectedAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerRecovery.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CUSTOMER_RECOVERY_LIST_INCLUDE,
      }),
      this.prisma.customerRecovery.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(recoveryId: string): Promise<CustomerRecoveryDetail | null> {
    return this.prisma.customerRecovery.findUnique({
      where: { id: recoveryId },
      include: CUSTOMER_RECOVERY_DETAIL_INCLUDE,
    });
  }

  async generateRecoveryNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.customerRecovery.findFirst({
      orderBy: { recoveryNumber: "desc" },
      select: { recoveryNumber: true },
    });
    const next = latest ? parseInt(latest.recoveryNumber.replace("REC-", ""), 10) + 1 : 1;
    return `REC-${String(next).padStart(6, "0")}`;
  }

  // Creates the recovery AND its mirrored credit entry on the shop's ledger in
  // one atomic transaction — a payment must never exist without reducing what
  // the shop owes, or the balance would silently drift.
  //
  // Also credits the collecting employee's cash-in-hand ledger for EVERY
  // payment mode, not just CASH — whatever they collect (cash, bank transfer,
  // mobile payment, cheque, etc.) is money they are personally responsible
  // for until they hand it to another employee via an EmployeeCashTransfer.
  // "Cash in hand" here means total custody, not literal banknotes.
  async create(data: CreateCustomerRecoveryData): Promise<CustomerRecoveryDetail> {
    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped advisory lock: serializes recovery-number
      // generation across concurrent create() calls (auto-released on
      // commit/rollback), so two requests can never collide on the same
      // "latest" number.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_recovery_number'))`;
      const recoveryNumber = await this.generateRecoveryNumber(tx);

      const recovery = await tx.customerRecovery.create({
        data: { ...data, recoveryNumber },
      });

      await tx.customerLedger.create({
        data: {
          customerId: data.customerId,
          date: recovery.collectedAt,
          type: CustomerLedgerEntryType.RECOVERY,
          reference: recovery.recoveryNumber,
          referenceId: recovery.id,
          description: `Recovery ${recovery.recoveryNumber}`,
          debit: 0,
          credit: data.amount,
          createdById: data.createdById,
        },
      });

      await tx.employeeCashLedger.create({
        data: {
          employeeId: data.salesPersonId,
          date: recovery.collectedAt,
          type: EmployeeCashLedgerEntryType.RECOVERY_COLLECTED,
          reference: recovery.recoveryNumber,
          referenceId: recovery.id,
          description: `Recovery ${recovery.recoveryNumber}`,
          debit: 0,
          credit: data.amount,
          createdById: data.createdById,
        },
      });

      return tx.customerRecovery.findUniqueOrThrow({
        where: { id: recovery.id },
        include: CUSTOMER_RECOVERY_DETAIL_INCLUDE,
      });
    });
  }
}
