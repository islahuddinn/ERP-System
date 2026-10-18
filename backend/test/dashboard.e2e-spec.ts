import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("Dashboard E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    jest.setTimeout(60000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await prisma.$connect();

    // Get or create tenant first (needed for user tenantId)
    const masterPrisma = (prisma as any).masterPrisma;
    let tenant = await masterPrisma.tenant.findFirst({
      where: { name: "Test Dashboard Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test Dashboard Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user and authenticate
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-dashboard@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-dashboard@example.com",
          name: "Test Dashboard User",
          password: hashedPassword,
          role: "ADMIN",
          tenantId,
        },
      });
    }

    userId = testUser.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-dashboard@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("GET /api/dashboard", () => {
    it("should return dashboard metrics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/dashboard")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("totalRevenue");
      expect(response.body).toHaveProperty("totalCost");
      expect(response.body).toHaveProperty("netProfit");
      expect(response.body).toHaveProperty("totalProducts");
      expect(response.body).toHaveProperty("totalStockQuantity");
      expect(response.body).toHaveProperty("totalStockValue");
    });

    it("should return dashboard metrics with date range", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/dashboard")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("totalRevenue");
    });
  });

  describe("GET /api/dashboard/factory", () => {
    it("should return factory dashboard metrics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/dashboard/factory")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("totalProductionOrders");
      expect(response.body).toHaveProperty("inProgressOrders");
      expect(response.body).toHaveProperty("completedOrders");
    });
  });
});
