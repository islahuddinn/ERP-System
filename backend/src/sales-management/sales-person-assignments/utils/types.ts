import { Prisma } from "@prisma/tenant-client";
import { SALES_PERSON_ASSIGNMENT_INCLUDE } from "./constants";

export type SalesPersonAssignmentDetail = Prisma.SalesPersonAssignmentGetPayload<{
  include: typeof SALES_PERSON_ASSIGNMENT_INCLUDE;
}>;
