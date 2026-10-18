import { Department, Prisma } from "@prisma/tenant-client";
import { DEPARTMENT_DETAIL_INCLUDE } from "./constants";

export type DepartmentDetail = Prisma.DepartmentGetPayload<{
  include: typeof DEPARTMENT_DETAIL_INCLUDE;
}> & { employeeCount: number };

export type DepartmentWithEmployeeCount = Department & { employeeCount: number };
