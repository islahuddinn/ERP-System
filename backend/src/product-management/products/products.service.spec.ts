import { ProductsService } from "./products.service";
import { AuditService } from "../../audit/audit.service";
import { BadRequestException, ConflictException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { join } from "path";

describe("ProductsService - Bulk Import", () => {
  let service: ProductsService;
  let tenantClient: any;
  let mockTenantClient: any;

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    mockTenantClient = {
      product: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      company: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      uOM: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      location: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      supplier: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      stockBalance: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      stockTransaction: {
        create: jest.fn().mockResolvedValue({}),
      },
      bulkImportRecord: {
        create: jest.fn().mockResolvedValue({ id: "import-1" }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(mockTenantClient)),
    };

    const mockAuditContext = {
      setOldValue: jest.fn(),
      setEntityLabel: jest.fn(),
      setMetadata: jest.fn(),
      getStore: jest.fn().mockReturnValue({}),
      run: jest.fn((fn: () => any) => fn()),
    };
    service = new ProductsService(mockAuditService as any, mockAuditContext as any);
    tenantClient = mockTenantClient as any;

    jest.clearAllMocks();
  });

  describe("downloadTemplate", () => {
    it("should generate template with Company Reference sheet", async () => {
      // Mock data
      const mockUoms = [
        { symbol: "pcs", name: "Pieces" },
        { symbol: "kg", name: "Kilograms" },
      ];
      const mockCompanies = [
        { name: "Test Company 1" },
        { name: "Test Company 2" },
      ];
      const mockLocations = [
        { name: "Main Warehouse" },
        { name: "Secondary Warehouse" },
      ];

      mockTenantClient.uOM.findMany.mockResolvedValue(mockUoms);
      mockTenantClient.company.findMany.mockResolvedValue(mockCompanies);
      mockTenantClient.location.findMany.mockResolvedValue(mockLocations);

      const result = await service.downloadTemplate(tenantClient);

      expect(result).toBeDefined();
      expect(result.filename).toBe("product-import-template.xlsx");
      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.content).toBeInstanceOf(Buffer);
      expect(mockTenantClient.uOM.findMany).toHaveBeenCalled();
      expect(mockTenantClient.company.findMany).toHaveBeenCalled();
      expect(mockTenantClient.location.findMany).toHaveBeenCalled();
    });

    it("should include Company field in sample data", async () => {
      const mockUoms = [{ symbol: "pcs", name: "Pieces" }];
      const mockCompanies = [{ name: "Test Company" }];
      const mockLocations = [{ name: "Main Warehouse" }];

      mockTenantClient.uOM.findMany.mockResolvedValue(mockUoms);
      mockTenantClient.company.findMany.mockResolvedValue(mockCompanies);
      mockTenantClient.location.findMany.mockResolvedValue(mockLocations);

      const result = await service.downloadTemplate(tenantClient);

      // Verify template was generated (we can't easily parse Excel in tests without extra libs)
      expect(result.content.length).toBeGreaterThan(0);
      expect(mockTenantClient.company.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("previewBulkImport", () => {
    it("should parse CSV file and return product data with Company", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Description,Barcode,Supplier Name,Cost Price,Selling Price,Reorder Level,Min Stock,Max Stock,Is Active
Test Product 1,Electronics,Apple Inc.,pcs,Test description,1234567890123,Test Supplier,100.00,150.00,10,5,100,true
Test Product 2,Clothing,Nike,pcs,Another description,9876543210987,Another Supplier,50.00,75.00,5,2,50,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-preview-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Ensure the directory exists and is accessible
      const stats = fs.statSync(tempDir);
      if (!stats.isDirectory()) {
        throw new Error(`Temp directory is not a directory: ${tempDir}`);
      }

      // Write file with explicit encoding
      fs.writeFileSync(tempFilePath, csvContent, "utf8");

      // Wait a moment for file system to sync (Windows issue)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify file exists and is readable
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Test file was not created at ${tempFilePath}`);
      }

      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error(`Test file is empty at ${tempFilePath}`);
      }

      // Use absolute path, normalize for Windows
      const absolutePath = path.resolve(tempFilePath);
      const normalizedPath = path.normalize(absolutePath);

      // Verify the normalized path exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(
          `File does not exist at normalized path: ${normalizedPath} (original: ${tempFilePath})`,
        );
      }

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: normalizedPath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      try {
        const result = await service.previewBulkImport(tenantClient, mockFile);

        expect(result).toBeDefined();
        expect(result.length).toBe(2);
        expect(result[0]).toMatchObject({
          name: "Test Product 1",
          category: "Electronics",
          company: "Apple Inc.",
          uomId: "pcs",
          costPrice: 100.0,
          sellingPrice: 150.0,
        });
        expect(result[1]).toMatchObject({
          name: "Test Product 2",
          category: "Clothing",
          company: "Nike",
          uomId: "pcs",
        });
      } finally {
        // Cleanup
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000); // Increase timeout to 15 seconds
  });

  describe("bulkImport", () => {
    const mockUserId = "test-user-id";

    beforeEach(() => {
      // Setup common mocks
      const mockUom = { id: "uom-pcs", symbol: "pcs", name: "Pieces" };
      mockTenantClient.uOM.findUnique.mockResolvedValue(mockUom);
      mockTenantClient.uOM.findFirst.mockResolvedValue(mockUom);

      const mockCategory = { id: "cat-1", name: "Electronics" };
      mockTenantClient.category.findFirst.mockResolvedValue(mockCategory);

      const mockCompany = { id: "comp-1", name: "Apple Inc." };
      mockTenantClient.company.findFirst.mockResolvedValue(mockCompany);

      mockTenantClient.product.findUnique.mockResolvedValue(null); // No existing SKU
      mockTenantClient.product.findFirst.mockResolvedValue(null); // No existing SKU
      mockTenantClient.product.create.mockResolvedValue({
        id: "product-1",
        name: "Test Product",
        sku: "PROD-123456-ABC",
        companyId: "comp-1",
        categoryId: "cat-1",
      });

      mockTenantClient.bulkImportRecord.create.mockResolvedValue({
        id: "import-1",
        fileName: "test.csv",
        status: "processing",
      });
    });

    it("should import products with Company field", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Cost Price,Selling Price,Reorder Level,Min Stock,Is Active
Test Product,Electronics,Apple Inc.,pcs,100.00,150.00,10,5,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-import-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Ensure the directory exists and is accessible
      const stats = fs.statSync(tempDir);
      if (!stats.isDirectory()) {
        throw new Error(`Temp directory is not a directory: ${tempDir}`);
      }

      // Write file with explicit encoding
      fs.writeFileSync(tempFilePath, csvContent, "utf8");

      // Wait a moment for file system to sync (Windows issue)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify file exists and is readable
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Test file was not created at ${tempFilePath}`);
      }

      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error(`Test file is empty at ${tempFilePath}`);
      }

      // Use absolute path, normalize for Windows
      const absolutePath = path.resolve(tempFilePath);
      const normalizedPath = path.normalize(absolutePath);

      // Verify the normalized path exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(
          `File does not exist at normalized path: ${normalizedPath} (original: ${tempFilePath})`,
        );
      }

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: normalizedPath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(1);
        expect(result.data.failed).toBe(0);

        // Verify company was looked up
        expect(mockTenantClient.company.findFirst).toHaveBeenCalledWith({
          where: {
            name: {
              equals: "Apple Inc.",
              mode: "insensitive",
            },
          },
        });

        // Verify product was created with companyId
        expect(mockTenantClient.product.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: "Test Product",
              companyId: "comp-1",
              categoryId: "cat-1",
            }),
          }),
        );
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should create new Company if it does not exist", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
New Product,Electronics,New Company Inc.,pcs,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-new-company-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(tempFilePath, csvContent);

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: tempFilePath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      // Mock: Company doesn't exist, then create it
      mockTenantClient.company.findFirst
        .mockResolvedValueOnce(null) // First lookup: not found
        .mockResolvedValueOnce({ id: "comp-new", name: "New Company Inc." }); // After creation

      mockTenantClient.company.create.mockResolvedValue({
        id: "comp-new",
        name: "New Company Inc.",
        isActive: true,
      });

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(1);

        // Verify company was created
        expect(mockTenantClient.company.create).toHaveBeenCalledWith({
          data: {
            name: "New Company Inc.",
            isActive: true,
          },
        });

        // Verify product was created with new companyId
        expect(mockTenantClient.product.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              companyId: "comp-new",
            }),
          }),
        );
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should handle products without Company field", async () => {
      const csvContent = `Product Name,Category,UOM,Is Active
Product Without Company,Electronics,pcs,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-no-company-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Ensure the directory exists and is accessible
      const stats = fs.statSync(tempDir);
      if (!stats.isDirectory()) {
        throw new Error(`Temp directory is not a directory: ${tempDir}`);
      }

      // Write file with explicit encoding
      fs.writeFileSync(tempFilePath, csvContent, "utf8");

      // Wait a moment for file system to sync (Windows issue)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify file exists and is readable
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Test file was not created at ${tempFilePath}`);
      }

      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error(`Test file is empty at ${tempFilePath}`);
      }

      // Use absolute path, normalize for Windows
      const absolutePath = path.resolve(tempFilePath);
      const normalizedPath = path.normalize(absolutePath);

      // Verify the normalized path exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(
          `File does not exist at normalized path: ${normalizedPath} (original: ${tempFilePath})`,
        );
      }

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: normalizedPath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(1);

        // Verify company lookup was not called
        expect(mockTenantClient.company.findFirst).not.toHaveBeenCalled();

        // Verify product was created without companyId
        expect(mockTenantClient.product.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              companyId: null,
            }),
          }),
        );
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should handle invalid UOM and report error", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
Test Product,Electronics,Apple Inc.,invalid-uom,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-invalid-uom-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(tempFilePath, csvContent);

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: tempFilePath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      // Mock UOM not found
      mockTenantClient.uOM.findUnique.mockResolvedValue(null);
      mockTenantClient.uOM.findFirst.mockResolvedValue(null);
      mockTenantClient.uOM.findMany.mockResolvedValue([]);

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(0);
        expect(result.data.failed).toBe(1);
        expect(result.data.errors.length).toBeGreaterThan(0);
        expect(result.data.errors[0].field).toBe("uom");
        expect(result.data.errors[0].message).toContain("Invalid UOM");
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should handle missing product name and report error", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
,Electronics,Apple Inc.,pcs,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-missing-name-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Ensure the directory exists and is accessible
      const stats = fs.statSync(tempDir);
      if (!stats.isDirectory()) {
        throw new Error(`Temp directory is not a directory: ${tempDir}`);
      }

      // Write file with explicit encoding
      fs.writeFileSync(tempFilePath, csvContent, "utf8");

      // Wait a moment for file system to sync (Windows issue)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify file exists and is readable
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Test file was not created at ${tempFilePath}`);
      }

      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error(`Test file is empty at ${tempFilePath}`);
      }

      // Use absolute path, normalize for Windows
      const absolutePath = path.resolve(tempFilePath);
      const normalizedPath = path.normalize(absolutePath);

      // Verify the normalized path exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(
          `File does not exist at normalized path: ${normalizedPath} (original: ${tempFilePath})`,
        );
      }

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: normalizedPath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(0);
        expect(result.data.failed).toBe(1);
        expect(result.data.errors[0].field).toBe("name");
        expect(result.data.errors[0].message).toContain(
          "Product name is required",
        );
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should auto-generate unique SKUs", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
Product 1,Electronics,Apple Inc.,pcs,true
Product 2,Electronics,Apple Inc.,pcs,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(
        tempDir,
        `test-sku-generation-${Date.now()}.csv`,
      );

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(tempFilePath, csvContent);

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: tempFilePath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      mockTenantClient.product.findUnique.mockResolvedValue(null); // No existing SKU
      mockTenantClient.product.create
        .mockResolvedValueOnce({ id: "product-1", sku: "PROD-123-ABC" })
        .mockResolvedValueOnce({ id: "product-2", sku: "PROD-456-DEF" });

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);
        expect(result.data.imported).toBe(2);

        // Verify SKU uniqueness check was called for each product
        expect(mockTenantClient.product.findFirst).toHaveBeenCalled();
        expect(mockTenantClient.product.create).toHaveBeenCalledTimes(2);
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);

    it("should create bulk import record with summary", async () => {
      const csvContent = `Product Name,Category,Company,UOM,Is Active
Test Product,Electronics,Apple Inc.,pcs,true`;

      // Use absolute path for temp directory
      const tempDir = join(process.cwd(), "temp");
      const tempFilePath = join(tempDir, `test-summary-${Date.now()}.csv`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Ensure the directory exists and is accessible
      const stats = fs.statSync(tempDir);
      if (!stats.isDirectory()) {
        throw new Error(`Temp directory is not a directory: ${tempDir}`);
      }

      // Write file with explicit encoding
      fs.writeFileSync(tempFilePath, csvContent, "utf8");

      // Wait a moment for file system to sync (Windows issue)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify file exists and is readable
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Test file was not created at ${tempFilePath}`);
      }

      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error(`Test file is empty at ${tempFilePath}`);
      }

      // Use absolute path, normalize for Windows
      const absolutePath = path.resolve(tempFilePath);
      const normalizedPath = path.normalize(absolutePath);

      // Verify the normalized path exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(
          `File does not exist at normalized path: ${normalizedPath} (original: ${tempFilePath})`,
        );
      }

      const mockFile = {
        originalname: "test.csv",
        filename: "test.csv",
        mimetype: "text/csv",
        path: normalizedPath,
        buffer: Buffer.from(csvContent),
      } as Express.Multer.File;

      try {
        const result = await service.bulkImport(
          tenantClient,
          mockFile,
          mockUserId,
        );

        expect(result.success).toBe(true);

        // Verify bulk import record was created
        expect(mockTenantClient.bulkImportRecord.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              fileName: expect.any(String),
              status: "processing",
              userId: mockUserId,
            }),
          }),
        );

        // Verify bulk import record was updated with results
        expect(mockTenantClient.bulkImportRecord.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: expect.any(String) },
            data: expect.objectContaining({
              status: "completed",
              successfulRecords: 1,
              failedRecords: 0,
              summary: expect.objectContaining({
                productsCreated: 1,
              }),
            }),
          }),
        );
      } finally {
        // Cleanup with normalized path
        const pathToDelete = path.normalize(tempFilePath);
        if (fs.existsSync(pathToDelete)) {
          fs.unlinkSync(pathToDelete);
        }
      }
    }, 15000);
  });
});
