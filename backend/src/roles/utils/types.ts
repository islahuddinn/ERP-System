import { Prisma } from "@prisma/tenant-client";
import { ROLE_INCLUDE } from "./constants";

export type RoleDetail = Prisma.RoleGetPayload<{ include: typeof ROLE_INCLUDE }>;
