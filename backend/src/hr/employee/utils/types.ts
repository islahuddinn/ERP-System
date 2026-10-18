import { Prisma } from "@prisma/tenant-client";
import { EMPLOYEE_DETAIL_INCLUDE, EMPLOYEE_LIST_INCLUDE } from "./constants";

export type EmployeeListItem = Prisma.EmployeeGetPayload<{
  include: typeof EMPLOYEE_LIST_INCLUDE;
}>;

export type EmployeeDetail = Prisma.EmployeeGetPayload<{
  include: typeof EMPLOYEE_DETAIL_INCLUDE;
}>;
