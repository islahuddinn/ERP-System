import { ConflictException, Injectable } from "@nestjs/common";
import {
  CustomerLedgerEntryType,
  CustomerReturnReason,
  CustomerReturnStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchStockRepository } from "../../sales-management/branch-stock/branch-stock.repository";
import { CustomerReturnFiltersDto } from "./dto/customer-return-filters.dto";
import { CUSTOMER_RETURN_DETAIL_INCLUDE, CUSTOMER_RETURN_LIST_INCLUDE } from "./utils/constants";
import { CustomerReturnDetail } from "./utils/types";

const CUSTOMER_RETURN_SORTABLE_FIELDS = ["returnDate", "createdAt", "totalAmount"];

export interface CreateCustomerReturnData {
  customerId: string;
  salesPersonId: string;
  deliveryItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reason: CustomerReturnReason;
  notes: string | null;
  createdById: string;
}

@Injectable()
export class CustomerReturnsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchStockRepository: BranchStockRepository,
  ) {}

  async findAll(
    customerReturnFiltersDto: CustomerReturnFiltersDto,
  ): Promise<PaginatedResponse<CustomerReturnDetail>> {
    const {
      customerId,
      salesPersonId,
      productId,
      deliveryItemId,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = customerReturnFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerReturnWhereInput = {
      ...(customerId && { customerId }),
      ...(salesPersonId && { salesPersonId }),
      ...(productId && { productId }),
      ...(deliveryItemId && { deliveryItemId }),
      ...(status && { status }),
    };

    const orderBy =
      sortBy && CUSTOMER_RETURN_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { returnDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerReturn.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CUSTOMER_RETURN_LIST_INCLUDE,
      }),
      this.prisma.customerReturn.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(returnId: string): Promise<CustomerReturnDetail | null> {
    return this.prisma.customerReturn.findUnique({
      where: { id: returnId },
      include: CUSTOMER_RETURN_DETAIL_INCLUDE,
    });
  }

  private async generateReturnNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.customerReturn.findFirst({
      orderBy: { returnNumber: "desc" },
      select: { returnNumber: true },
    });
    const next = latest ? parseInt(latest.returnNumber.replace("RET-", ""), 10) + 1 : 1;
    return `RET-${String(next).padStart(6, "0")}`;
  }

  // Sum of quantity across every non-REJECTED return already made against
  // this delivery item — mirrors BranchStockReturnsRepository's remaining-
  // returnable-quantity guard.
  private async getReturnedQuantitySum(
    deliveryItemId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const { _sum } = await tx.customerReturn.aggregate({
      where: { deliveryItemId, status: { not: CustomerReturnStatus.REJECTED } },
      _sum: { quantity: true },
    });
    return _sum.quantity ?? 0;
  }

  /**
   * Created PENDING — no ledger entry and no stock change here. The
   * advisory lock on deliveryItemId serializes concurrent return-creation
   * against the same delivery item, so two overlapping requests can never
   * both claim the same remaining returnable quantity.
   */
  async create(
    data: CreateCustomerReturnData,
    deliveredQuantity: number,
  ): Promise<CustomerReturnDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.deliveryItemId}))`;

      const alreadyReturned = await this.getReturnedQuantitySum(data.deliveryItemId, tx);
      const remaining = deliveredQuantity - alreadyReturned;

      if (data.quantity > remaining) {
        throw new ConflictException(
          `Cannot return ${data.quantity} — only ${remaining} remains returnable on this delivery item`,
        );
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_return_number'))`;
      const returnNumber = await this.generateReturnNumber(tx);

      const customerReturn = await tx.customerReturn.create({
        data: { ...data, returnNumber },
      });

      return tx.customerReturn.findUniqueOrThrow({
        where: { id: customerReturn.id },
        include: CUSTOMER_RETURN_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * Approves a PENDING return: claims it, restores stock to the delivering
   * Sales Person's branch, then posts the CustomerLedger credit — the same
   * write that used to happen unconditionally at creation, now gated on
   * approval.
   */
  async approve(
    returnId: string,
    approvedById: string,
    restockBranchId: string,
  ): Promise<CustomerReturnDetail> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.customerReturn.updateMany({
        where: { id: returnId, status: CustomerReturnStatus.PENDING },
        data: { status: CustomerReturnStatus.APPROVED, approvedById, approvedAt: new Date() },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          "This return is no longer pending — it may have already been approved or rejected",
        );
      }

      const customerReturn = await tx.customerReturn.findUniqueOrThrow({
        where: { id: returnId },
      });

      await this.branchStockRepository.increment(
        restockBranchId,
        customerReturn.productId,
        customerReturn.quantity,
        tx,
      );

      await tx.customerLedger.create({
        data: {
          customerId: customerReturn.customerId,
          date: customerReturn.approvedAt as Date,
          type: CustomerLedgerEntryType.RETURN,
          reference: customerReturn.returnNumber,
          referenceId: customerReturn.id,
          description: `Return ${customerReturn.returnNumber} approved`,
          debit: 0,
          credit: Number(customerReturn.totalAmount),
          createdById: approvedById,
        },
      });

      return tx.customerReturn.findUniqueOrThrow({
        where: { id: returnId },
        include: CUSTOMER_RETURN_DETAIL_INCLUDE,
      });
    });
  }

  /**
   * approvedById/approvedAt reused for "who last decided on this return,
   * and when" — same convention as BranchStockRequestsRepository.reject.
   */
  async reject(returnId: string, rejectedById: string): Promise<CustomerReturnDetail> {
    const claim = await this.prisma.customerReturn.updateMany({
      where: { id: returnId, status: CustomerReturnStatus.PENDING },
      data: { status: CustomerReturnStatus.REJECTED, approvedById: rejectedById, approvedAt: new Date() },
    });

    if (claim.count === 0) {
      throw new ConflictException(
        "This return is no longer pending — it may have already been approved or rejected",
      );
    }

    return this.prisma.customerReturn.findUniqueOrThrow({
      where: { id: returnId },
      include: CUSTOMER_RETURN_DETAIL_INCLUDE,
    });
  }
}
