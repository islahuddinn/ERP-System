import { Prisma } from "@prisma/tenant-client";

export const EMPLOYEE_SHIFT_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  crossesMidnight: true,
  graceMinutes: true,
  breakMinutes: true,
  type: true,
} satisfies Prisma.ShiftSelect;

export const ATTENDANCE_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  shift: {
    select: {
      id: true,
      name: true,
      type: true,
      startTime: true,
      endTime: true,
      crossesMidnight: true,
      graceMinutes: true,
      breakMinutes: true,
    },
  },
} satisfies Prisma.AttendanceInclude;
