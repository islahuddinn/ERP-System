import { Prisma } from "@prisma/tenant-client";

// #19 — a valid contact phone is digits/spaces and + - ( ) only, 7–20 chars.
// Mirrors the shared convention already used by suppliers and locations so the
// whole codebase validates phones the same way.
export const PHONE_REGEX = /^[0-9+\-()\s]{7,20}$/;
export const PHONE_ERROR_MESSAGE =
  "Phone number is invalid — use digits, spaces, and + - ( ) only (7-20 chars)";

export const EMPLOYEE_LIST_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: {
        select: { id: true, name: true, description: true },
      },
      loginAccess: true,
    },
  },
} satisfies Prisma.EmployeeInclude;

export const EMPLOYEE_DETAIL_INCLUDE = {
  ...EMPLOYEE_LIST_INCLUDE,
  documents: { orderBy: { uploadedAt: "desc" as const } },
  shift: { select: { id: true, name: true, type: true, startTime: true, endTime: true } },
} satisfies Prisma.EmployeeInclude;
