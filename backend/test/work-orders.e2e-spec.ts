import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";

describe("Work Orders E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let productionOrderId: string;
  let plantId: string;

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
      where: { name: "Test Work Orders Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test Work Orders Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    tenantId = tenant.id;

    // Create test user
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "test-workorders@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-workorders@example.com",
          name: "Test Work Orders User",
          password: hashedPassword,
          role: "ADMIN",
          tenantId,
        },
      });
    }

    userId = testUser.id;

    // Create test plant
    const location =
      (await prisma.location.findFirst()) ||
      (await prisma.location.create({
        data: { name: "Test Location" },
      }));

    const plant =
      (await prisma.plant.findFirst()) ||
      (await prisma.plant.create({
        data: {
          name: "Test Plant",
          code: "TEST-PLANT",
          locationId: location.id,
          plantType: "MANUFACTURING",
        },
      }));

    plantId = plant.id;

    // Create test production order
    const product =
      (await prisma.product.findFirst()) ||
      (await prisma.product.create({
        data: {
          name: "Test Product",
          sku: "TEST-SKU",
          uomId: (
            (await prisma.uOM.findFirst()) ||
            (await prisma.uOM.create({
              data: { name: "Piece", symbol: "pcs", code: "PIECE", category: "COUNT", isSystem: false },
            }))
          ).id,
        },
      }));

    const productionOrder = await prisma.productionOrder.create({
      data: {
        orderNumber: "PO-TEST-001",
        title: "Test Production Order",
        description: "Test",
        productId: product.id,
        quantity: 100,
        plantId: plant.id,
        tenantId: tenantId,
        createdById: userId,
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(),
        priority: "MEDIUM",
        status: "DRAFT",
      },
    });

    productionOrderId = productionOrder.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test-workorders@example.com",
        password: testPassword,
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("POST /api/work-orders", () => {
    it("should create a work order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/work-orders")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .send({
          title: "Test Work Order",
          description: "Test description",
          productionOrderId,
          plantId,
          status: "SCHEDULED",
          priority: "MEDIUM",
          scheduledStartDate: new Date().toISOString(),
          scheduledEndDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe("Test Work Order");
    });
  });

  describe("GET /api/work-orders", () => {
    it("should return list of work orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/work-orders")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/work-orders/schedule", () => {
    it("should return work order schedule", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/work-orders/schedule")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", tenantId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
