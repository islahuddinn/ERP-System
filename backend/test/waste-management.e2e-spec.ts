import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("Waste Management E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let productId: string;

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
      where: { name: "Test Waste Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test Waste Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-waste@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-waste@example.com",
          name: "Test Waste User",
          password: hashedPassword,
          role: "ADMIN",
          tenantId,
        },
      });
    }

    // Create test product
    const uom =
      (await prisma.uOM.findFirst()) ||
      (await prisma.uOM.create({
        data: { name: "Piece", symbol: "pcs", code: "PIECE", category: "COUNT", isSystem: false },
      }));

    const product =
      (await prisma.product.findFirst()) ||
      (await prisma.product.create({
        data: {
          name: "Test Product",
          sku: "TEST-WASTE-PROD",
          uomId: uom.id,
        },
      }));

    productId = product.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-waste@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("POST /api/waste-management", () => {
    it("should create a waste record", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/waste-management")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .send({
          wasteNumber: "WASTE-TEST-001",
          wasteType: "PRODUCTION",
          productId,
          quantity: 10,
          cost: 100,
          reason: "Test waste",
          sourceType: "MANUAL",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.wasteNumber).toBe("WASTE-TEST-001");
    });
  });

  describe("GET /api/waste-management", () => {
    it("should return list of waste records", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/waste-management")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
