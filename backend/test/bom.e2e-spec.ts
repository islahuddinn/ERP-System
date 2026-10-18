import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("BOM E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let productId: string;
  let materialId: string;

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
      where: { name: "Test BOM Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test BOM Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-bom@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-bom@example.com",
          name: "Test BOM User",
          password: hashedPassword,
          role: "ADMIN",
          tenantId,
        },
      });
    }

    // Create test products
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
          sku: "TEST-PROD",
          uomId: uom.id,
        },
      }));

    productId = product.id;

    const material = await prisma.product.create({
      data: {
        name: "Test Material",
        sku: "TEST-MAT",
        uomId: uom.id,
      },
    });

    materialId = material.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-bom@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("POST /api/bom", () => {
    it("should create a BOM", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/bom")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .send({
          name: "Test BOM",
          description: "Test BOM description",
          productId,
          version: 1,
          items: [
            {
              materialId,
              quantity: 10,
              uomId: (await prisma.uOM.findFirst()).id,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Test BOM");
    });
  });

  describe("GET /api/bom", () => {
    it("should return list of BOMs", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/bom")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
