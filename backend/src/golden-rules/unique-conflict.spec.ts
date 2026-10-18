import { Prisma } from "@prisma/tenant-client";
import { ConflictException } from "@nestjs/common";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";

describe("golden rule: unique conflicts surface as 409", () => {
  it("turns a Prisma P2002 into ConflictException", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.19.3",
      meta: { target: ["email"] },
    });

    expect(() => handlePrismaUniqueError(error, "Email already exists")).toThrow(ConflictException);
    expect(() => handlePrismaUniqueError(error, "Email already exists")).toThrow("Email already exists");
  });
});
