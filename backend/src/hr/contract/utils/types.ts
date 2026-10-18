import { Prisma } from "@prisma/tenant-client";
import { CONTRACT_DETAIL_INCLUDE, CONTRACT_LIST_INCLUDE, SALARY_REVISION_INCLUDE } from "./constants";

export type ContractListItem = Prisma.EmployeeContractGetPayload<{
  include: typeof CONTRACT_LIST_INCLUDE;
}>;

export type ContractDetail = Prisma.EmployeeContractGetPayload<{
  include: typeof CONTRACT_DETAIL_INCLUDE;
}>;

export type SalaryRevisionWithCreator = Prisma.SalaryRevisionGetPayload<{
  include: typeof SALARY_REVISION_INCLUDE;
}>;
