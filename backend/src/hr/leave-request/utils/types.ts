import { LeaveApprovalStatus, LeaveDurationType, Prisma } from "@prisma/tenant-client";
import { LEAVE_REQUEST_INCLUDE, USER_SELECT } from "./constants";

export type UserSelect = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export type UsersMap = Record<string, UserSelect>;

type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: typeof LEAVE_REQUEST_INCLUDE;
}>;

type LeaveRequestApprovalWithApprover = LeaveRequestWithRelations["approvals"][number] & {
  approver: UserSelect | null;
};

// totalDays is a Decimal in the DB but serialized to a plain number for API responses.
export type LeaveRequestDetail = Omit<LeaveRequestWithRelations, "totalDays" | "approvals"> & {
  totalDays: number;
  createdBy: UserSelect | null;
  approvals: LeaveRequestApprovalWithApprover[];
};

// Internal params for LeaveRequestRepository.decideApproval — not an HTTP-facing DTO.
export interface DecideApprovalParams {
  leaveRequestId: string;
  approverId: string;
  decision: LeaveApprovalStatus;
  remarks: string | undefined;
  isPaid: boolean;
  totalDays: number;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  durationType: LeaveDurationType;
}
