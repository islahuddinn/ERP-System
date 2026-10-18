import { Injectable } from "@nestjs/common";
import {
  BranchLedgerEntryType,
  EmployeeCashLedgerEntryType,
  EmployeeCashTransferStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../common/dto/pagination.dto";
import { getPaginationParams } from "../common/utils/pagination.helper";
import { EmployeeCashTransferFiltersDto } from "./dto/employee-cash-transfer-filters.dto";
import {
  EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE,
  EMPLOYEE_CASH_TRANSFER_LIST_INCLUDE,
} from "./utils/constants";
import { EmployeeCashTransferDetail } from "./utils/types";

export interface CreateEmployeeCashTransferData {
  fromEmployeeId: string;
  toEmployeeId: string;
  amount: number;
  senderNotes: string | null;
  createdById: string;
  settlesTransferId: string | null;
}

export interface UpdateEmployeeCashTransferData {
  amount?: number;
  senderNotes?: string | null;
}

@Injectable()
export class EmployeeCashTransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    employeeCashTransferFiltersDto: EmployeeCashTransferFiltersDto,
  ): Promise<PaginatedResponse<EmployeeCashTransferDetail>> {
    const { fromEmployeeId, toEmployeeId, page = 1, limit = 10 } = employeeCashTransferFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.EmployeeCashTransferWhereInput = {
      ...(fromEmployeeId && { fromEmployeeId }),
      ...(toEmployeeId && { toEmployeeId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employeeCashTransfer.findMany({
        where,
        skip,
        take,
        orderBy: { transferredAt: "desc" },
        include: EMPLOYEE_CASH_TRANSFER_LIST_INCLUDE,
      }),
      this.prisma.employeeCashTransfer.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(transferId: string): Promise<EmployeeCashTransferDetail | null> {
    return this.prisma.employeeCashTransfer.findUnique({
      where: { id: transferId },
      include: EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE,
    });
  }

  async generateTransferNumber(): Promise<string> {
    const latest = await this.prisma.employeeCashTransfer.findFirst({
      orderBy: { transferNumber: "desc" },
      select: { transferNumber: true },
    });
    const next = latest ? parseInt(latest.transferNumber.replace("ECT-", ""), 10) + 1 : 1;
    return `ECT-${String(next).padStart(6, "0")}`;
  }

  // Only creates the transfer record itself, status PENDING — no ledger
  // entries yet. Nobody's cash-in-hand changes until the receiver confirms
  // via respond(); the sender's unilateral claim is never enough on its own.
  async create(data: CreateEmployeeCashTransferData): Promise<EmployeeCashTransferDetail> {
    const transferNumber = await this.generateTransferNumber();

    const transfer = await this.prisma.employeeCashTransfer.create({
      data: { ...data, transferNumber },
      include: EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE,
    });

    return transfer;
  }

  // Sender-only edit, and only reachable while PENDING (enforced in the
  // service) — amount/notes can still change before the receiver has acted.
  async update(
    transferId: string,
    data: UpdateEmployeeCashTransferData,
  ): Promise<EmployeeCashTransferDetail> {
    await this.prisma.employeeCashTransfer.update({
      where: { id: transferId },
      data,
    });

    return this.prisma.employeeCashTransfer.findUniqueOrThrow({
      where: { id: transferId },
      include: EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE,
    });
  }

  // The receiver's decision. RECEIVED writes the double-entry (debit sender,
  // credit receiver) atomically alongside the status change — REJECTED only
  // ever updates the transfer itself, no ledger rows are written.
  async respond(
    transferId: string,
    decision: EmployeeCashTransferStatus,
    receiverNotes: string | null,
  ): Promise<EmployeeCashTransferDetail> {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.employeeCashTransfer.update({
        where: { id: transferId },
        data: {
          status: decision,
          receiverNotes,
          respondedAt: new Date(),
        },
      });

      if (decision === EmployeeCashTransferStatus.RECEIVED) {
        await tx.employeeCashLedger.create({
          data: {
            employeeId: transfer.fromEmployeeId,
            date: transfer.respondedAt!,
            type: EmployeeCashLedgerEntryType.TRANSFER_OUT,
            reference: transfer.transferNumber,
            referenceId: transfer.id,
            description: `Transfer ${transfer.transferNumber} to employee`,
            debit: transfer.amount.toNumber(),
            credit: 0,
            createdById: transfer.createdById,
          },
        });

        await tx.employeeCashLedger.create({
          data: {
            employeeId: transfer.toEmployeeId,
            date: transfer.respondedAt!,
            type: EmployeeCashLedgerEntryType.TRANSFER_IN,
            reference: transfer.transferNumber,
            referenceId: transfer.id,
            description: `Transfer ${transfer.transferNumber} from employee`,
            debit: 0,
            credit: transfer.amount.toNumber(),
            createdById: transfer.createdById,
          },
        });

        // Only reached when this transfer was explicitly tagged as settling
        // one specific BranchStockTransfer's debt (see
        // CreateEmployeeCashTransferDto.settlesTransferId) — an ordinary
        // person-to-person handoff never touches BranchLedger.
        //
        // referenceId is the settled transfer's own id, matching the
        // STOCK_RECEIVED debit row written for it in
        // BranchStockTransfersRepository.confirmReceipt — that shared id is
        // what lets "amount still due on this transfer" be computed as a
        // plain debit-minus-credit aggregate over BranchLedger.
        if (transfer.settlesTransferId) {
          const settledTransfer = await tx.branchStockTransfer.findUniqueOrThrow({
            where: { id: transfer.settlesTransferId },
            select: { transferNumber: true, toBranchId: true, fromBranchId: true },
          });

          const toBranch = await tx.branch.findUniqueOrThrow({
            where: { id: settledTransfer.toBranchId },
            select: { distributorId: true },
          });

          await tx.branchLedger.create({
            data: {
              branchId: settledTransfer.toBranchId,
              counterpartyBranchId: settledTransfer.fromBranchId,
              date: transfer.respondedAt!,
              type: BranchLedgerEntryType.PAYMENT,
              referenceId: transfer.settlesTransferId,
              distributorIdAtTime: toBranch.distributorId,
              description: `Payment via cash transfer ${transfer.transferNumber} for stock transfer ${settledTransfer.transferNumber}`,
              debit: 0,
              credit: transfer.amount.toNumber(),
              createdById: transfer.createdById,
            },
          });
        }
      }

      return tx.employeeCashTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE,
      });
    });
  }
}
