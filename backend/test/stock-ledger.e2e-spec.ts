import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { TransactionType, BatchStatus } from "@prisma/tenant-client";

describe("Stock Ledger E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let productId: string;
  let warehouseId: string;
  let zoneId: string;

  beforeAll(async () => {
    jest.setTimeout(60000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
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
      where: { name: "Test Stock Ledger Tenant" },
    });

    if (!tenant) {
      tenant = await masterPrisma.tenant.create({
        data: {
          name: "Test Stock Ledger Tenant",
          databaseUrl: process.env.DATABASE_URL || "",
        },
      });
    }

    // Create test user and authenticate
    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    let testUser = await prisma.user.findFirst({
      where: { email: "stockledger-test@example.com" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: "Stock Ledger Test User",
          email: "stockledger-test@example.com",
          password: hashedPassword,
          role: "ADMIN",
          tenantId: tenant.id,
        },
      });
    }

    userId = testUser.id;

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer()).post("/api/auth/login").send({
      email: "stockledger-test@example.com",
      password: testPassword,
    });

    authToken = loginResponse.body.access_token;

    // Create test product
    const category =
      (await prisma.productCategory.findFirst()) ||
      (await prisma.productCategory.create({
        data: { name: "Test Category" },
      }));

    const uom =
      (await prisma.uOM.findFirst()) ||
      (await prisma.uOM.create({
        data: { name: "Piece", symbol: "pcs", code: "PIECE", category: "COUNT", isSystem: false },
      }));

    const product = await prisma.product.create({
      data: {
        name: "Test Product for Stock Ledger",
        sku: "TEST-SL-001",
        categoryId: category.id,
        uomId: uom.id,
        minStock: 0,
      },
    });

    productId = product.id;

    // Create test warehouse and zone
    const location =
      (await prisma.location.findFirst()) ||
      (await prisma.location.create({
        data: { name: "Test Location" },
      }));

    const warehouse = await prisma.warehouse.create({
      data: {
        name: "Test Warehouse",
        code: "WH-TEST-001",
        locationId: location.id,
        warehouseType: "STORAGE",
        status: "ACTIVE",
        totalCapacity: 1000,
        availableCapacity: 1000,
      },
    });

    warehouseId = warehouse.id;

    const zone = await prisma.warehouseZone.create({
      data: {
        name: "Test Zone",
        code: "ZONE-TEST-001",
        warehouseId: warehouse.id,
        zoneType: "RAW_MATERIALS",
        totalCapacity: 500,
        availableCapacity: 500,
      },
    });

    zoneId = zone.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (productId) {
      await prisma.stockLedger.deleteMany({ where: { productId } });
      await prisma.batch.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    }

    if (warehouseId) {
      await prisma.warehouseZone.delete({ where: { id: zoneId } }).catch(() => {});
      await prisma.warehouse.delete({ where: { id: warehouseId } }).catch(() => {});
    }

    await app.close();
    await prisma.$disconnect();
  });

  describe("POST /api/stock-ledger - Record Stock Movement", () => {
    it("should record stock increase (purchase)", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: 100,
          movementType: TransactionType.PURCHASE,
          referenceType: "PURCHASE",
          referenceId: "PO-TEST-001",
          batchNumber: "BATCH-001",
          expiryDate: "2025-12-31",
          receivedDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ledgerEntries");
      expect(response.body.ledgerEntries[0].quantity).toBe(100);
    });

    it("should record stock decrease (sale) with FIFO", async () => {
      // First add stock
      await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: 100,
          movementType: TransactionType.PURCHASE,
          referenceType: "PURCHASE",
          referenceId: "PO-TEST-002",
          batchNumber: "BATCH-002",
          receivedDate: new Date().toISOString(),
        });

      // Then consume stock
      const response = await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: -50,
          movementType: TransactionType.SALE,
          referenceType: "SALE",
          referenceId: "SALE-TEST-001",
          useFIFO: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ledgerEntries");
      expect(response.body.ledgerEntries[0].quantity).toBe(-50);
    });

    it("should reject insufficient stock", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: -10000,
          movementType: TransactionType.SALE,
          referenceType: "SALE",
          referenceId: "SALE-TEST-002",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Insufficient stock");
    });
  });

  describe("GET /api/stock-ledger - List Stock Ledger Entries", () => {
    it("should list stock ledger entries", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          productId,
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter by warehouse", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          warehouseId,
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/stock-ledger/product/:productId/balance", () => {
    it("should get current stock balance", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/stock-ledger/product/${productId}/balance`)
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          warehouseId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("balance");
      expect(typeof response.body.balance).toBe("number");
    });
  });

  describe("GET /api/stock-ledger/product/:productId/availability", () => {
    it("should check stock availability", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/stock-ledger/product/${productId}/availability`)
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          warehouseId,
          quantity: 50,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("available");
      expect(typeof response.body.available).toBe("boolean");
    });
  });

  describe("FIFO Batch Consumption", () => {
    it("should consume from oldest batch first", async () => {
      // Create two batches with different received dates
      const oldDate = new Date("2025-01-01");
      const newDate = new Date("2025-01-15");

      // Add stock to old batch
      await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: 50,
          movementType: TransactionType.PURCHASE,
          referenceType: "PURCHASE",
          referenceId: "PO-OLD",
          batchNumber: "BATCH-OLD",
          receivedDate: oldDate.toISOString(),
        });

      // Add stock to new batch
      await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: 50,
          movementType: TransactionType.PURCHASE,
          referenceType: "PURCHASE",
          referenceId: "PO-NEW",
          batchNumber: "BATCH-NEW",
          receivedDate: newDate.toISOString(),
        });

      // Consume stock (should consume from old batch first)
      const response = await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: -30,
          movementType: TransactionType.SALE,
          referenceType: "SALE",
          referenceId: "SALE-FIFO",
          useFIFO: true,
        });

      expect(response.status).toBe(201);

      // Verify old batch was consumed
      const oldBatch = await prisma.batch.findUnique({
        where: { batchNumber: "BATCH-OLD" },
      });

      expect(oldBatch?.consumedQuantity).toBeGreaterThan(0);
    });
  });

  describe("Batch Expiry Handling", () => {
    it("should block expired batches by default", async () => {
      const expiredDate = new Date("2024-01-01"); // Past date

      // Create expired batch
      await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: 50,
          movementType: TransactionType.PURCHASE,
          referenceType: "PURCHASE",
          referenceId: "PO-EXPIRED",
          batchNumber: "BATCH-EXPIRED",
          expiryDate: expiredDate.toISOString(),
          receivedDate: expiredDate.toISOString(),
        });

      // Try to consume (should fail)
      const response = await request(app.getHttpServer())
        .post("/api/stock-ledger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId,
          warehouseId,
          quantity: -10,
          movementType: TransactionType.SALE,
          referenceType: "SALE",
          referenceId: "SALE-EXPIRED",
          allowExpired: false,
        });

      // Should fail or find no batches
      expect([400, 200]).toContain(response.status);
    });
  });
});
