import { Prisma } from "@prisma/tenant-client";
import { ConflictException } from "@nestjs/common";

export function handlePrismaUniqueError(error: unknown, message?: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    if (message) {
      throw new ConflictException(message);
    }

    const fields = error.meta?.target as string[] | string;

    const fieldList = Array.isArray(fields) ? fields : [fields];

    throw new ConflictException(`Duplicate value for: ${fieldList.join(", ")}`);
  }
  throw error;
}
