import { Prisma } from "@prisma/tenant-client";
import { EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE } from "./constants";

export type EmployeeCashTransferDetail = Prisma.EmployeeCashTransferGetPayload<{
  include: typeof EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE;
}>;
