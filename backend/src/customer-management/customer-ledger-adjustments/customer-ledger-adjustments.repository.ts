import { Injectable } from "@nestjs/common";
import {
  CustomerLedgerAdjustmentType,
  CustomerLedgerEntryType,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter, getPaginationParams } from "../../common/utils/pagination.helper";
import { CustomerLedgerAdjustmentFiltersDto } from "./dto/customer-ledger-adjustment-filters.dto";
import {
  CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE,
  CUSTOMER_LEDGER_ADJUSTMENT_LIST_INCLUDE,
} from "./utils/constants";
import { CustomerLedgerAdjustmentDetail } from "./utils/types";

const CUSTOMER_LEDGER_ADJUSTMENT_SORTABLE_FIELDS = ["adjustedAt", "createdAt", "amount"];

export interface CreateCustomerLedgerAdjustmentData {
  customerId: string;
  type: CustomerLedgerAdjustmentType;
  amount: number;
  reason: string;
  notes: string | null;
  createdById: string;
}

@Injectable()
export class CustomerLedgerAdjustmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerLedgerAdjustmentFiltersDto: CustomerLedgerAdjustmentFiltersDto,
  ): Promise<PaginatedResponse<CustomerLedgerAdjustmentDetail>> {
    const { customerId, type, search, sortBy, sortOrder, page = 1, limit = 10 } =
      customerLedgerAdjustmentFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerLedgerAdjustmentWhereInput = {
      ...(customerId && { customerId }),
      ...(type && { type }),
    };

    if (search) {
      where.OR = buildSearchFilter(search, ["adjustmentNumber", "reason"]);
    }

    const orderBy =
      sortBy && CUSTOMER_LEDGER_ADJUSTMENT_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { adjustedAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerLedgerAdjustment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CUSTOMER_LEDGER_ADJUSTMENT_LIST_INCLUDE,
      }),
      this.prisma.customerLedgerAdjustment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(adjustmentId: string): Promise<CustomerLedgerAdjustmentDetail | null> {
    return this.prisma.customerLedgerAdjustment.findUnique({
      where: { id: adjustmentId },
      include: CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE,
    });
  }

  private async generateAdjustmentNumber(
    tx: Prisma.TransactionClient,
    type: CustomerLedgerAdjustmentType,
  ): Promise<string> {
    const prefix = type === CustomerLedgerAdjustmentType.CREDIT_NOTE ? "CN" : "DN";
    const latest = await tx.customerLedgerAdjustment.findFirst({
      where: { type },
      orderBy: { adjustmentNumber: "desc" },
      select: { adjustmentNumber: true },
    });
    const next = latest ? parseInt(latest.adjustmentNumber.replace(`${prefix}-`, ""), 10) + 1 : 1;
    return `${prefix}-${String(next).padStart(6, "0")}`;
  }

  async create(data: CreateCustomerLedgerAdjustmentData): Promise<CustomerLedgerAdjustmentDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_ledger_adjustment_number'))`;
      const adjustmentNumber = await this.generateAdjustmentNumber(tx, data.type);

      const adjustment = await tx.customerLedgerAdjustment.create({
        data: {
          adjustmentNumber,
          customerId: data.customerId,
          type: data.type,
          amount: data.amount,
          reason: data.reason,
          notes: data.notes,
          createdById: data.createdById,
        },
      });

      const isCreditNote = data.type === CustomerLedgerAdjustmentType.CREDIT_NOTE;
      const label = isCreditNote ? "Credit note" : "Debit note";

      await tx.customerLedger.create({
        data: {
          customerId: data.customerId,
          date: adjustment.adjustedAt,
          type: CustomerLedgerEntryType.ADJUSTMENT,
          reference: adjustment.adjustmentNumber,
          referenceId: adjustment.id,
          description: `${label} ${adjustment.adjustmentNumber} — ${data.reason}`,
          debit: isCreditNote ? 0 : data.amount,
          credit: isCreditNote ? data.amount : 0,
          notes: data.notes,
          createdById: data.createdById,
        },
      });

      return tx.customerLedgerAdjustment.findUniqueOrThrow({
        where: { id: adjustment.id },
        include: CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE,
      });
    });
  }
}
