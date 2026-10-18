import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { CustomerLedgerAdjustmentType } from "@prisma/tenant-client";
import { CustomersService } from "../customers/customers.service";
import { CustomerLedgerAdjustmentsRepository } from "./customer-ledger-adjustments.repository";
import { CreateCustomerLedgerAdjustmentDto } from "./dto/create-customer-ledger-adjustment.dto";
import { CustomerLedgerAdjustmentFiltersDto } from "./dto/customer-ledger-adjustment-filters.dto";
import { CustomerLedgerAdjustmentDetail } from "./utils/types";
import { GlPostingService } from "../../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../../financial/gl-posting/utils/enums";

@Injectable()
export class CustomerLedgerAdjustmentsService {
  constructor(
    private readonly customerLedgerAdjustmentsRepository: CustomerLedgerAdjustmentsRepository,
    private readonly customersService: CustomersService,
    private readonly glPostingService: GlPostingService,
  ) {}

  async listCustomerLedgerAdjustments(
    customerLedgerAdjustmentFiltersDto: CustomerLedgerAdjustmentFiltersDto,
  ): Promise<PaginatedResponse<CustomerLedgerAdjustmentDetail>> {
    return this.customerLedgerAdjustmentsRepository.findAll(customerLedgerAdjustmentFiltersDto);
  }

  async getCustomerLedgerAdjustment(adjustmentId: string): Promise<CustomerLedgerAdjustmentDetail> {
    return this.checkExistence(adjustmentId);
  }

  async createCustomerLedgerAdjustment(
    createCustomerLedgerAdjustmentDto: CreateCustomerLedgerAdjustmentDto,
    req: RequestWithUser,
  ): Promise<CustomerLedgerAdjustmentDetail> {
    const { id: loggedInUserId } = req.user;
    const { customerId, type, amount, reason, notes } = createCustomerLedgerAdjustmentDto;

    await this.customersService.checkExistence(customerId);

    const adjustment = await this.customerLedgerAdjustmentsRepository.create({
      customerId,
      type,
      amount,
      reason,
      notes: notes ?? null,
      createdById: loggedInUserId,
    });

    const postedAmount = Number(amount);
    if (postedAmount > 0) {
      const isCreditNote = type === CustomerLedgerAdjustmentType.CREDIT_NOTE;
      await this.glPostingService.postBalancedEntry({
        sourceType: GlSourceType.CUSTOMER_LEDGER_ADJUSTMENT,
        sourceId: adjustment.id,
        postingKind: isCreditNote ? GlPostingKind.CREDIT_NOTE : GlPostingKind.DEBIT_NOTE,
        entryDate: new Date(),
        description: `${isCreditNote ? "Credit" : "Debit"} note ${adjustment.adjustmentNumber}`,
        createdById: loggedInUserId,
        lines: isCreditNote
          ? [
              { accountKey: "SALES_REVENUE", debit: postedAmount, credit: 0, description: "Credit note" },
              { accountKey: "AR", debit: 0, credit: postedAmount, description: "AR reduced" },
            ]
          : [
              { accountKey: "AR", debit: postedAmount, credit: 0, description: "AR increased" },
              { accountKey: "SALES_REVENUE", debit: 0, credit: postedAmount, description: "Debit note" },
            ],
      });
    }

    return adjustment;
  }

  async checkExistence(adjustmentId: string): Promise<CustomerLedgerAdjustmentDetail> {
    const adjustment = await this.customerLedgerAdjustmentsRepository.findById(adjustmentId);

    if (!adjustment) {
      throw new NotFoundException("Customer ledger adjustment not found");
    }

    return adjustment;
  }
}
