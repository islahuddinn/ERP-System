import { Designation, Prisma } from "@prisma/tenant-client";
import { DESIGNATION_DETAIL_INCLUDE } from "./constants";

export type DesignationDetail = Prisma.DesignationGetPayload<{
  include: typeof DESIGNATION_DETAIL_INCLUDE;
}> & { employeeCount: number };

export type DesignationWithEmployeeCount = Designation & { employeeCount: number };
