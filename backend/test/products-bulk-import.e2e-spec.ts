import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcrypt";

describe("Products Bulk Import (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Increase timeout for setup (database connection, app initialization)
    jest.setTimeout(30000); // 30 seconds

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

      // Apply same configuration as main.ts
      app.setGlobalPrefix("api");

      // Enable CORS for tests
      app.enableCors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      });

      // Add validation pipe for request validation
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      await app.init();

      prisma = moduleFixture.get<PrismaService>(PrismaService);

      // Ensure database connection is ready
      await prisma.$connect();

      // Create a test user and get auth token
      const testPassword = "TestPassword123!";
      const hashedPassword = await bcrypt.hash(testPassword, 10);

      const testUser = await prisma.user.findFirst({
        where: { email: "test@example.com" },
      });

      // Get or create tenant first (needed for user tenantId)
      const masterPrisma = (prisma as any).masterPrisma;
      let testTenant = await masterPrisma.tenant.findFirst({
        where: { name: "Test Bulk Import Tenant" },
      });

      if (!testTenant) {
        testTenant = await masterPrisma.tenant.create({
          data: {
            name: "Test Bulk Import Tenant",
            databaseUrl: process.env.DATABASE_URL || "",
          },
        });
      }

      if (!testUser) {
        // Create test user if doesn't exist
        const newUser = await prisma.user.create({
          data: {
            email: "test@example.com",
            name: "Test User",
            password: hashedPassword,
            role: "ADMIN",
            tenantId: testTenant.id,
          },
        });
        userId = newUser.id;
      } else {
        userId = testUser.id;
        // Update password in case it changed
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
      }

      // Get auth token by logging in
      const loginResponse = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: testPassword,
        });

      // Accept both 200 (OK) and 201 (Created) status codes
      // Some NestJS configurations may return 201 for POST requests
      if (![200, 201].includes(loginResponse.status)) {
        console.error("Unexpected login status:", {
          status: loginResponse.status,
          body: loginResponse.body,
          text: loginResponse.text,
        });
        throw new Error(`Login failed with status ${loginResponse.status}`);
      }

      authToken = loginResponse.body.access_token;

      if (!authToken) {
        console.error("Login response missing access_token:", {
          status: loginResponse.status,
          body: loginResponse.body,
        });
        throw new Error("Failed to obtain auth token");
      }
    } catch (error) {
      console.error("Error in beforeAll:", error);
      throw error;
    }
  }, 30000); // Set timeout to 30 seconds

  afterAll(async () => {
    jest.setTimeout(30000); // Increase timeout for cleanup

    try {
      // Clean up test data
      if (prisma) {
        await prisma.product.deleteMany({
          where: {
            OR: [
              { sku: { startsWith: "PROD-TEST-" } },
              { name: { contains: "E2E Test" } },
              { name: { contains: "Product With New Company" } },
              { name: { contains: "Bulk Product" } },
            ],
          },
        });
        await prisma.company.deleteMany({
          where: {
            OR: [
              { name: { contains: "Test Company" } },
              { name: "New E2E Company" },
            ],
          },
        });

        // Clean up test user (after deleting related records)
        // Find user first to avoid foreign key issues
        const testUser = await prisma.user.findFirst({
          where: { email: "test@example.com" },
        });

        if (testUser) {
          // Delete related records first (foreign key constraint)
          await prisma.bulkImportRecord.deleteMany({
            where: { userId: testUser.id },
          });

          // Now delete user
          await prisma.user.delete({
            where: { id: testUser.id },
          });
        }

        // Disconnect Prisma
        await prisma.$disconnect();
      }

      if (app) {
        await app.close();
      }
    } catch (error) {
      console.error("Error in afterAll cleanup:", error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  }, 30000);

  describe("POST /api/products/bulk-import/template", () => {
    it("should download template with Company Reference sheet", async () => {
      // Create test companies if they don't exist
      await prisma.company.upsert({
        where: { name: "Test Company A" },
        update: { isActive: true },
        create: { name: "Test Company A", isActive: true },
      });
      await prisma.company.upsert({
        where: { name: "Test Company B" },
        update: { isActive: true },
        create: { name: "Test Company B", isActive: true },
      });

      const response = await request(app.getHttpServer())
        .get("/api/products/bulk-import/template")
        .set("Authorization", `Bearer ${authToken}`)
        .parse((res, callback) => {
          // Handle binary response manually
          const data: Buffer[] = [];
          res.on("data", (chunk: Buffer) => data.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(data)));
        });

      // Accept both 200 and 201
      expect([200, 201]).toContain(response.status);

      expect(response.headers["content-type"]).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(response.headers["content-disposition"]).toContain(
        "product-import-template.xlsx",
      );

      // Response body should be a buffer (from .parse() callback)
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify it's a valid Excel file (starts with ZIP signature for .xlsx files)
      // Excel files (.xlsx) are ZIP archives, so they start with 'PK' (0x504B)
      const fileSignature = response.body.slice(0, 2).toString("hex");
      expect(fileSignature).toBe("504b"); // ZIP file signature
    });
  });

  describe("POST /api/products/bulk-import/preview", () => {
    it("should preview CSV file with Company field", async () => {
      // Ensure test companies exist
      await prisma.company.upsert({
        where: { name: "Test Company A" },
        update: { isActive: true },
        create: { name: "Test Company A", isActive: true },
      });
      await prisma.company.upsert({
        where: { name: "Test Company B" },
        update: { isActive: true },
        create: { name: "Test Company B", isActive: true },
      });

      const csvContent = `Product Name,Category,Company,UOM,Description,Cost Price,Selling Price,Reorder Level,Min Stock,Is Active
Test Product 1,Electronics,Test Company A,pcs,Test description,100.00,150.00,10,5,true
Test Product 2,Clothing,Test Company B,pcs,Another description,50.00,75.00,5,2,true`;

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(tempDir, `test-preview-${Date.now()}.csv`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import/preview")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toMatchObject({
        name: "Test Product 1",
        category: "Electronics",
        company: "Test Company A",
        uomId: "pcs",
      });
      expect(response.body[1]).toMatchObject({
        name: "Test Product 2",
        category: "Clothing",
        company: "Test Company B",
      });

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    it("should handle missing Company field gracefully", async () => {
      const csvContent = `Product Name,Category,UOM,Is Active
Product Without Company,Electronics,pcs,true`;

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(
        tempDir,
        `test-preview-no-company-${Date.now()}.csv`,
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import/preview")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status);

      expect(response.body.length).toBe(1);
      expect(response.body[0].company).toBeUndefined();

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });
  });

  describe("POST /api/products/bulk-import", () => {
    beforeEach(async () => {
      // Ensure test UOM exists
      await prisma.uOM.upsert({
        where: { code: "PIECE" },
        update: { isActive: true },
        create: {
          id: "uom-pcs",
          symbol: "pcs",
          name: "Pieces",
          code: "PIECE",
          category: "COUNT",
          isSystem: false,
          isActive: true,
        },
      });

      // Clean up existing test products
      await prisma.product.deleteMany({
        where: { sku: { startsWith: "PROD-TEST-" } },
      });
    });

    it("should import products with Company field", async () => {
      // Ensure test companies exist
      await prisma.company.upsert({
        where: { name: "Test Company A" },
        update: { isActive: true },
        create: { name: "Test Company A", isActive: true },
      });

      const csvContent = `Product Name,Category,Company,UOM,Cost Price,Selling Price,Reorder Level,Min Stock,Is Active
E2E Test Product,Electronics,Test Company A,pcs,100.00,150.00,10,5,true`;

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(tempDir, `test-import-${Date.now()}.csv`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(1);
      expect(response.body.data.failed).toBe(0);

      // Verify product was created in database
      const createdProduct = await prisma.product.findFirst({
        where: { name: "E2E Test Product" },
        include: { company: true },
      });

      expect(createdProduct).toBeDefined();
      expect(createdProduct?.company?.name).toBe("Test Company A");

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (createdProduct) {
        await prisma.product.delete({ where: { id: createdProduct.id } });
      }
    });

    it("should create new Company if it does not exist during import", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
Product With New Company,Electronics,New E2E Company,pcs,true`;

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(
        tempDir,
        `test-import-new-company-${Date.now()}.csv`,
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      // Ensure company doesn't exist
      await prisma.company.deleteMany({
        where: { name: "New E2E Company" },
      });

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(1);

      // Verify company was created
      const createdCompany = await prisma.company.findFirst({
        where: { name: "New E2E Company" },
      });
      expect(createdCompany).toBeDefined();
      expect(createdCompany?.isActive).toBe(true);

      // Verify product was linked to new company
      const createdProduct = await prisma.product.findFirst({
        where: { name: "Product With New Company" },
        include: { company: true },
      });
      expect(createdProduct?.company?.name).toBe("New E2E Company");

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (createdProduct) {
        await prisma.product.delete({ where: { id: createdProduct.id } });
      }
      if (createdCompany) {
        await prisma.company.delete({ where: { id: createdCompany.id } });
      }
    });

    it("should handle validation errors and report them", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
,Electronics,Test Company A,invalid-uom,true`;

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(
        tempDir,
        `test-import-errors-${Date.now()}.csv`,
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status); // Endpoint returns 200 even with errors

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(0);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.errors.length).toBeGreaterThan(0);

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    it("should import multiple products correctly", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Cost Price,Selling Price,Is Active
Bulk Product 1,Electronics,Test Company A,pcs,100.00,150.00,true
Bulk Product 2,Clothing,Test Company B,pcs,50.00,75.00,true
Bulk Product 3,Electronics,Test Company A,pcs,200.00,250.00,true`;

      // Ensure test companies exist
      await prisma.company.upsert({
        where: { name: "Test Company B" },
        update: { isActive: true },
        create: { name: "Test Company B", isActive: true },
      });

      const tempDir = path.join(process.cwd(), "temp");
      const tempFilePath = path.join(
        tempDir,
        `test-bulk-import-${Date.now()}.csv`,
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, csvContent);

      const response = await request(app.getHttpServer())
        .post("/api/products/bulk-import")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", tempFilePath);

      // Accept both 200 and 201 for POST requests
      expect([200, 201]).toContain(response.status);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(3);
      expect(response.body.data.failed).toBe(0);

      // Verify all products were created
      const products = await prisma.product.findMany({
        where: { name: { startsWith: "Bulk Product" } },
        include: { company: true },
      });

      expect(products.length).toBe(3);
      expect(
        products.filter((p) => p.company?.name === "Test Company A").length,
      ).toBe(2);
      expect(
        products.filter((p) => p.company?.name === "Test Company B").length,
      ).toBe(1);

      // Cleanup
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      await prisma.product.deleteMany({
        where: { name: { startsWith: "Bulk Product" } },
      });
    });
  });
});
