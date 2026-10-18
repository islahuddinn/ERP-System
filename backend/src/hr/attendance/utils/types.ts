import { Prisma } from "@prisma/tenant-client";
import { ATTENDANCE_INCLUDE, EMPLOYEE_SHIFT_SELECT } from "./constants";

export type UserSummary = { id: string; firstName: string; lastName: string };

export type EmployeeShift = Prisma.ShiftGetPayload<{ select: typeof EMPLOYEE_SHIFT_SELECT }>;

export type AttendanceListItem = Prisma.AttendanceGetPayload<{
  include: typeof ATTENDANCE_INCLUDE;
}>;

export type AttendanceDetail = AttendanceListItem & {
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
};
