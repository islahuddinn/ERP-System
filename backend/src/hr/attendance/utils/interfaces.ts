import { AttendanceStatus, ShiftType } from "@prisma/tenant-client";

export interface ShiftSnapshot {
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  // Nullable — a shift with no explicit grace period configured is treated
  // as zero grace (see calculateLateMinutes).
  graceMinutes: number | null;
  breakMinutes: number;
  type: ShiftType;
}

export interface AttendanceMetrics {
  workedMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
}
