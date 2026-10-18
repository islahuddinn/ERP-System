import { LoanApprovalStatus, Prisma } from "@prisma/tenant-client";
import { LOAN_REQUEST_INCLUDE, USER_SELECT } from "./constants";

export type UserSelect = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export type UsersMap = Record<string, UserSelect>;

// Derived from paidAmount vs totalAmount — never stored, always computed on read.
export type LoanRepaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";

type LoanRequestWithRelations = Prisma.LoanRequestGetPayload<{
  include: typeof LOAN_REQUEST_INCLUDE;
}>;

type LoanRequestApprovalWithApprover = LoanRequestWithRelations["approvals"][number] & {
  approver: UserSelect | null;
};

// totalAmount/paidAmount/installment amounts are Decimal in the DB but serialized
// to plain numbers for API responses, same as totalDays on LeaveRequestDetail.
export type LoanRequestDetail = Omit<
  LoanRequestWithRelations,
  "totalAmount" | "paidAmount" | "approvals" | "installments"
> & {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  repaymentStatus: LoanRepaymentStatus;
  createdBy: UserSelect | null;
  approvals: LoanRequestApprovalWithApprover[];
  installments: (Omit<LoanRequestWithRelations["installments"][number], "amount"> & {
    amount: number;
  })[];
};

// Internal params for LoanRequestRepository.decideApproval — not an HTTP-facing DTO.
export interface DecideApprovalParams {
  loanRequestId: string;
  approverId: string;
  decision: LoanApprovalStatus;
  remarks: string | undefined;
  totalAmount: number;
  totalInstallments: number;
}
