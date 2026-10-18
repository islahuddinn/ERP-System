import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../src/users/guards/permissions.guard";
import { ReportsController } from "../src/financial/reports/reports.controller";
import { ReportsService } from "../src/financial/reports/reports.service";
import { PayrollController } from "../src/hr/payroll/payroll.controller";
import { PayrollService } from "../src/hr/payroll/payroll.service";
import { GrnController } from "../src/grn/grn.controller";
import { GrnService } from "../src/grn/grn.service";

class TokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }
    const token = auth.slice("Bearer ".length);
    if (token === "invalid") {
      throw new UnauthorizedException();
    }
    if (token === "forbidden") {
      req.user = { id: "clerk", roleId: "clerk" };
      return true;
    }
    req.user = { id: "admin", roleId: "admin", tenantId: "tenant-a" };
    return true;
  }
}

class RolePermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) {
      throw new ForbiddenException("User not authenticated");
    }
    if (req.user.roleId === "admin") {
      return true;
    }
    throw new ForbiddenException("Access denied");
  }
}

describe("API smoke (401 / 403 / 400 / 200 / 409)", () => {
  let app: INestApplication;
  const payrollId = "11111111-1111-4111-8111-111111111111";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController, PayrollController, GrnController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getTrialBalance: jest.fn().mockResolvedValue({
              isBalanced: true,
              accounts: [],
              totals: { totalDebit: 0, totalCredit: 0 },
            }),
          },
        },
        {
          provide: PayrollService,
          useValue: {
            pay: jest.fn().mockRejectedValue(new ConflictException("Payroll already paid")),
          },
        },
        {
          provide: GrnService,
          useValue: { create: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TokenGuard)
      .overrideGuard(PermissionsGuard)
      .useClass(RolePermissionsGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("401 — unauthenticated client cannot read money reports", async () => {
    await request(app.getHttpServer()).get("/financial/reports/trial-balance").expect(401);
  });

  it("401 — invalid bearer token is rejected", async () => {
    await request(app.getHttpServer())
      .get("/financial/reports/trial-balance")
      .set("Authorization", "Bearer invalid")
      .expect(401);
  });

  it("403 — authenticated user without permission cannot read money reports", async () => {
    await request(app.getHttpServer())
      .get("/financial/reports/trial-balance")
      .set("Authorization", "Bearer forbidden")
      .expect(403);
  });

  it("200 — permitted user can read trial balance", async () => {
    const res = await request(app.getHttpServer())
      .get("/financial/reports/trial-balance")
      .set("Authorization", "Bearer admin")
      .expect(200);
    expect(res.body.isBalanced).toBe(true);
  });

  it("400 — GRN create rejects an empty body", async () => {
    await request(app.getHttpServer())
      .post("/grn")
      .set("Authorization", "Bearer admin")
      .send({})
      .expect(400);
  });

  it("400 — payroll pay rejects a non-UUID id", async () => {
    await request(app.getHttpServer())
      .post("/hr/payroll/not-a-uuid/pay")
      .set("Authorization", "Bearer admin")
      .expect(400);
  });

  it("409 — paying the same payroll twice is a conflict", async () => {
    await request(app.getHttpServer())
      .post(`/hr/payroll/${payrollId}/pay`)
      .set("Authorization", "Bearer admin")
      .expect(409);
  });
});
