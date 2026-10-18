import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("Profit Reports E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;

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
      where: { name: "Test Profit Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test Profit Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user and authenticate
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-profit@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-profit@example.com",
          name: "Test Profit User",
          password: hashedPassword,
          role: "ADMIN",
          tenantId,
        },
      });
    }

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-profit@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("GET /api/profit", () => {
    it("should return overall profit", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/profit")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("revenue");
      expect(response.body).toHaveProperty("cost");
      expect(response.body).toHaveProperty("netProfit");
      expect(response.body).toHaveProperty("profitMargin");
    });
  });

  describe("GET /api/profit/daily", () => {
    it("should return daily profit", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/profit/daily")
        .query({ date: "2024-01-15" })
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("revenue");
      expect(response.body).toHaveProperty("netProfit");
    });
  });

  describe("GET /api/profit/monthly", () => {
    it("should return monthly profit", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/profit/monthly")
        .query({ year: 2024, month: 1 })
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("revenue");
      expect(response.body).toHaveProperty("netProfit");
    });
  });

  describe("GET /api/profit/product", () => {
    it("should return profit by product", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/profit/product")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/profit/plant", () => {
    it("should return profit by plant", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/profit/plant")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
