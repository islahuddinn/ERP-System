import { BadRequestException, Injectable } from "@nestjs/common";
import {
  LoanApprovalStatus,
  LoanInstallmentStatus,
  LoanRequestStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "../../common/utils/pagination.helper";
import { LoanRequestFiltersDto } from "./dto/loan-request-filters.dto";
import { LOAN_REQUEST_INCLUDE, USER_SELECT } from "./utils/constants";
import { DecideApprovalParams, LoanRequestDetail, UsersMap } from "./utils/types";
import { splitAmountIntoInstallments } from "./utils/installment-calculations";

@Injectable()
export class LoanRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    loanRequestFiltersDto: LoanRequestFiltersDto,
  ): Promise<PaginatedResponse<LoanRequestDetail>> {
    const {
      employeeId,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
    } = loanRequestFiltersDto;
    const skip = (page - 1) * limit;
    const where: Prisma.LoanRequestWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { employee: { user: { OR: buildSearchFilter(search, ["firstName", "lastName"]) } } },
      ];
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.loanRequest.findMany({
        where,
        include: LOAN_REQUEST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.loanRequest.count({ where }),
    ]);

    const usersMap = await this.fetchUsersMap(
      data.flatMap((loanRequest) => [
        loanRequest.createdById,
        ...loanRequest.approvals.map((approval) => approval.approverId),
      ]),
    );

    const loans = data.map((loanRequest) => this.serializeLoanRequest(loanRequest, usersMap));

    return buildPaginatedResponse(loans, total, page, limit);
  }

  async findById(loanRequestId: string): Promise<LoanRequestDetail | null> {
    const loanRequest = await this.prisma.loanRequest.findUnique({
      where: { id: loanRequestId },
      include: LOAN_REQUEST_INCLUDE,
    });

    const usersMap = await this.fetchUsersMapForLoanRequest(loanRequest);
    return this.serializeLoanRequest(loanRequest, usersMap);
  }

  async delete(loanRequestId: string): Promise<void> {
    await this.prisma.loanRequest.delete({ where: { id: loanRequestId } });
  }

  /**
   * Updates the loan request's own fields and, when approverIds is provided,
   * replaces its approvals with a fresh PENDING set for the new approver list.
   * The service layer guarantees this only ever runs while the request is
   * still PENDING and no approver has decided yet.
   */
  async update(
    loanRequestId: string,
    data: Prisma.LoanRequestUncheckedUpdateInput,
    approverIds: string[] | undefined,
  ): Promise<LoanRequestDetail> {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.loanRequest.update({ where: { id: loanRequestId }, data });

      if (approverIds) {
        await tx.loanRequestApproval.deleteMany({ where: { loanRequestId } });
        await tx.loanRequestApproval.createMany({
          data: approverIds.map((approverId) => ({ loanRequestId, approverId })),
        });
      }

      return tx.loanRequest.findUniqueOrThrow({
        where: { id: loanRequestId },
        include: LOAN_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLoanRequest(result);
    return this.serializeLoanRequest(result, usersMap);
  }

  async findEmployeeById(
    employeeId: string,
  ): Promise<{ id: string; userId: string | null } | null> {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });
  }

  async validateApproverIds(approverIds: string[]): Promise<void> {
    const uniqueApproverIds = [...new Set(approverIds)];

    const foundUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueApproverIds }, loginAccess: "ENABLED" },
      select: { id: true },
    });

    const foundIds = new Set(foundUsers.map((user) => user.id));
    const invalidIds = uniqueApproverIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length) {
      throw new BadRequestException(
        `The following approver user ID(s) are invalid: ${invalidIds.join(", ")}`,
      );
    }
  }

  async create(
    data: Prisma.LoanRequestUncheckedCreateInput,
    approverIds: string[],
  ): Promise<LoanRequestDetail> {
    const result = await this.prisma.$transaction(async (tx) => {
      const loanRequest = await tx.loanRequest.create({ data });

      await tx.loanRequestApproval.createMany({
        data: approverIds.map((approverId) => ({ loanRequestId: loanRequest.id, approverId })),
      });

      return tx.loanRequest.findUniqueOrThrow({
        where: { id: loanRequest.id },
        include: LOAN_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLoanRequest(result);
    return this.serializeLoanRequest(result, usersMap);
  }

  /**
   * Records one approver's decision and recomputes the overall request status
   * from every approver's current decision. A single rejection puts the whole
   * request into REJECTED; the request only becomes APPROVED once every
   * approver has approved, at which point the repayment installments are
   * generated in the same transaction. The caller (service layer) prevents
   * this method from running once the request has already reached APPROVED,
   * so installments can only ever be generated once.
   */
  async decideApproval(decideApprovalParams: DecideApprovalParams): Promise<LoanRequestDetail> {
    const { loanRequestId, approverId, decision, remarks, totalAmount, totalInstallments } =
      decideApprovalParams;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.loanRequestApproval.update({
        where: { loanRequestId_approverId: { loanRequestId, approverId } },
        data: {
          status: decision,
          remarks: remarks ?? null,
          decidedAt: decision === LoanApprovalStatus.PENDING ? null : new Date(),
        },
      });

      const overallStatus = await this.resolveOverallStatus(tx, loanRequestId);

      await tx.loanRequest.update({
        where: { id: loanRequestId },
        data: { status: overallStatus },
      });

      if (overallStatus === LoanRequestStatus.APPROVED) {
        await this.generateInstallments(tx, loanRequestId, totalAmount, totalInstallments);
      }

      return tx.loanRequest.findUniqueOrThrow({
        where: { id: loanRequestId },
        include: LOAN_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLoanRequest(result);
    return this.serializeLoanRequest(result, usersMap);
  }

  /**
   * Marks a single installment as paid, adds its amount onto the loan's
   * running paidAmount, and closes the loan out once every installment has
   * been paid. The service layer guarantees the installment belongs to this
   * loan request and is still PENDING before calling this method.
   */
  async markInstallmentPaid(
    loanRequestId: string,
    loanInstallmentId: string,
  ): Promise<LoanRequestDetail> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Conditioning the update on status: PENDING makes this atomic — if two
      // requests race to pay the same installment, only one updates a row and
      // the other gets count 0, so paidAmount can never be double-counted.
      const { count } = await tx.loanInstallment.updateMany({
        where: { id: loanInstallmentId, loanRequestId, status: LoanInstallmentStatus.PENDING },
        data: { status: LoanInstallmentStatus.PAID, paidAt: new Date() },
      });

      if (count === 0) {
        throw new BadRequestException(
          "Installment does not belong to this loan request or is not pending",
        );
      }

      const installment = await tx.loanInstallment.findUniqueOrThrow({
        where: { id: loanInstallmentId },
        select: { amount: true },
      });

      const loanRequest = await tx.loanRequest.update({
        where: { id: loanRequestId },
        data: { paidAmount: { increment: installment.amount } },
      });

      if (Number(loanRequest.paidAmount) >= Number(loanRequest.totalAmount)) {
        await tx.loanRequest.update({
          where: { id: loanRequestId },
          data: { status: LoanRequestStatus.COMPLETED },
        });
      }

      return tx.loanRequest.findUniqueOrThrow({
        where: { id: loanRequestId },
        include: LOAN_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLoanRequest(result);
    return this.serializeLoanRequest(result, usersMap);
  }

  /**
   * A single rejection rejects the whole request; it's approved only once every approver has approved.
   */
  private async resolveOverallStatus(
    tx: Prisma.TransactionClient,
    loanRequestId: string,
  ): Promise<
    | typeof LoanRequestStatus.APPROVED
    | typeof LoanRequestStatus.REJECTED
    | typeof LoanRequestStatus.PENDING
  > {
    const approvals = await tx.loanRequestApproval.findMany({
      where: { loanRequestId },
      select: { status: true },
    });

    if (approvals.some((approval) => approval.status === LoanApprovalStatus.REJECTED)) {
      return LoanRequestStatus.REJECTED;
    }

    if (approvals.every((approval) => approval.status === LoanApprovalStatus.APPROVED)) {
      return LoanRequestStatus.APPROVED;
    }

    return LoanRequestStatus.PENDING;
  }

  // Splits totalAmount evenly across totalInstallments (the last installment absorbs any
  // rounding remainder) and schedules the first return for the month after approval.

  /**
   * Once any approver has recorded a decision, the request is locked from
   * further changes — both update and delete share this restriction.
   */
  private async generateInstallments(
    tx: Prisma.TransactionClient,
    loanRequestId: string,
    totalAmount: number,
    totalInstallments: number,
  ): Promise<void> {
    const amounts = splitAmountIntoInstallments(totalAmount, totalInstallments);
    const approvalDate = new Date();

    await tx.loanInstallment.createMany({
      data: amounts.map((amount, index) => ({
        loanRequestId,
        installmentNumber: index + 1,
        amount,
        returnMonth: this.addMonths(approvalDate, index + 1),
      })),
    });
  }

  /**
   * Returns "YYYY-MM" for `monthsAhead` months after `fromDate`.
   */
  private addMonths(fromDate: Date, monthsAhead: number): string {
    const targetDate = new Date(
      Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + monthsAhead, 1),
    );
    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  private async fetchUsersMapForLoanRequest(loanRequest: any): Promise<UsersMap> {
    return this.fetchUsersMap([
      loanRequest?.createdById,
      ...(loanRequest?.approvals?.map((approval: any) => approval.approverId) ?? []),
    ]);
  }

  private async fetchUsersMap(ids: (string | null | undefined)[]): Promise<UsersMap> {
    const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
    if (!uniqueIds.length) return {};

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: USER_SELECT,
    });

    return Object.fromEntries(users.map((user) => [user.id, user]));
  }

  private serializeLoanRequest(loanRequest: any, usersMap: UsersMap): any {
    if (!loanRequest) return loanRequest;

    const totalAmount = Number(loanRequest.totalAmount);
    const paidAmount = Number(loanRequest.paidAmount);

    return {
      ...loanRequest,
      totalAmount,
      paidAmount,
      remainingAmount: Math.round((totalAmount - paidAmount) * 100) / 100,
      repaymentStatus: this.resolveRepaymentStatus(paidAmount, totalAmount),
      createdBy: loanRequest.createdById ? (usersMap[loanRequest.createdById] ?? null) : null,
      approvals: loanRequest.approvals.map((approval: any) => ({
        ...approval,
        approver: usersMap[approval.approverId] ?? null,
      })),
      installments: loanRequest.installments.map((installment: any) => ({
        ...installment,
        amount: Number(installment.amount),
      })),
    };
  }

  async getInstallmentsForMonth(
    employeeId: string,
    paidMonth: string,
  ): Promise<
    Array<{
      id: string;
      loanRequestId: string;
      amount: Prisma.Decimal;
      installmentNumber: number;
    }>
  > {
    return this.prisma.loanInstallment.findMany({
      where: {
        returnMonth: paidMonth,
        status: LoanInstallmentStatus.PENDING,
        loanRequest: {
          employeeId,
          status: LoanRequestStatus.APPROVED,
        },
      },
      select: {
        id: true,
        loanRequestId: true,
        amount: true,
        installmentNumber: true,
      },
    });
  }

  private resolveRepaymentStatus(
    paidAmount: number,
    totalAmount: number,
  ): "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID" {
    if (paidAmount <= 0) return "UNPAID";
    if (paidAmount >= totalAmount) return "FULLY_PAID";
    return "PARTIALLY_PAID";
  }
}
