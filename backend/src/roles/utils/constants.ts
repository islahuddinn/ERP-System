import { Prisma } from "@prisma/tenant-client";

export const ROLE_INCLUDE = {
  rolePermissions: {
    include: {
      permission: {
        select: { id: true, name: true, module: true, action: true, description: true },
      },
    },
    orderBy: { permission: { module: "asc" as const } },
  },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;
