import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("Quality Control E2E Tests", () => {
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
      where: { name: "Test QC Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test QC Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-qc@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-qc@example.com",
          name: "Test QC User",
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
          sku: "TEST-QC-PROD",
          uomId: uom.id,
        },
      }));

    productId = product.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-qc@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("POST /api/quality-control/inspections", () => {
    it("should create a quality inspection", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/quality-control/inspections")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .send({
          inspectionNumber: "QC-TEST-001",
          title: "Test Inspection",
          productId,
          inspectionType: "INCOMING",
          qualityStatus: "PENDING",
          results: "Test results",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.inspectionNumber).toBe("QC-TEST-001");
    });
  });

  describe("GET /api/quality-control/inspections", () => {
    it("should return list of inspections", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/quality-control/inspections")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
