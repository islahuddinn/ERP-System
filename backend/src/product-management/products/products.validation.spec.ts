import { Test, TestingModule } from "@nestjs/testing";
import { ProductsService } from "./products.service";
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { PrismaClient } from "@prisma/tenant-client";
import { CreateProductDto } from "./dto/create-product.dto";

describe("ProductsService - Validation Tests", () => {
  let service: ProductsService;
  let mockTenantClient: any;
  const userId = "test-user-id";

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockTenantClient = {
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      uOM: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: "company-id", name: "Test Company" }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe("SKU Uniqueness Validation", () => {
    it("should reject duplicate SKU for same company", async () => {
      const createDto: CreateProductDto = {
        name: "Product A",
        code: "SKU-001",
        uomId: "uom-id",
        companyId: "company-id",
        reorderLevel: 10,
        minStock: 5,
        isActive: true,
      };

      mockTenantClient.uOM.findUnique.mockResolvedValue({
        id: "uom-id",
        name: "Pieces",
        symbol: "pcs",
      } as any);

      mockTenantClient.product.findFirst.mockResolvedValue({
        id: "existing-product-id",
        code: "SKU-001",
        companyId: "company-id",
      } as any);

      await expect(service.create(mockTenantClient, createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should allow same SKU for different companies", async () => {
      const createDto: CreateProductDto = {
        name: "Product A",
        code: "SKU-001",
        uomId: "uom-id",
        companyId: "company-1",
        reorderLevel: 10,
        minStock: 5,
        isActive: true,
      };

      mockTenantClient.uOM.findUnique.mockResolvedValue({
        id: "uom-id",
        name: "Pieces",
        symbol: "pcs",
      } as any);

      mockTenantClient.company.findUnique.mockResolvedValue({
        id: "company-1",
        name: "Company 1",
      } as any);

      // Existing product with same SKU but different company
      mockTenantClient.product.findFirst.mockResolvedValue({
        id: "existing-product-id",
        code: "SKU-001",
        companyId: "company-2", // Different company
      } as any);

      // Should not throw - different company
      mockTenantClient.product.findFirst.mockResolvedValueOnce(null);
      mockTenantClient.product.create.mockResolvedValue({
        id: "new-product-id",
        ...createDto,
      } as any);

      const result = await service.create(mockTenantClient, createDto, userId);

      expect(result).toBeDefined();
    });

    it("should reject duplicate SKU when companyId is null (both null)", async () => {
      const createDto: CreateProductDto = {
        name: "Product A",
        code: "SKU-001",
        uomId: "uom-id",
        reorderLevel: 10,
        minStock: 5,
        isActive: true,
      };

      mockTenantClient.uOM.findUnique.mockResolvedValue({
        id: "uom-id",
        name: "Pieces",
        symbol: "pcs",
      } as any);

      // Existing product with same SKU and null companyId
      mockTenantClient.product.findFirst.mockResolvedValue({
        id: "existing-product-id",
        code: "SKU-001",
        companyId: null,
      } as any);

      await expect(service.create(mockTenantClient, createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("UOM Validation", () => {
    it("should reject product creation with invalid UOM", async () => {
      const createDto: CreateProductDto = {
        name: "Product A",
        code: "SKU-001",
        uomId: "invalid-uom-id",
        reorderLevel: 10,
        minStock: 5,
        isActive: true,
      };

      mockTenantClient.uOM.findUnique.mockResolvedValue(null);

      await expect(service.create(mockTenantClient, createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("Update Validation", () => {
    it("should reject updating SKU to duplicate within same company", async () => {
      const productId = "product-id";
      const updateDto = {
        code: "DUPLICATE-SKU",
      };

      const existingProduct = {
        id: productId,
        code: "OLD-SKU",
        companyId: "company-id",
      };

      mockTenantClient.product.findUnique.mockResolvedValue(existingProduct as any);

      // Another product with the new SKU and same company
      mockTenantClient.product.findFirst.mockResolvedValue({
        id: "other-product-id",
        code: "DUPLICATE-SKU",
        companyId: "company-id",
      } as any);

      await expect(service.update(mockTenantClient, productId, updateDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should allow updating SKU to value used by different company", async () => {
      const productId = "product-id";
      const updateDto = {
        code: "SHARED-SKU",
      };

      const existingProduct = {
        id: productId,
        code: "OLD-SKU",
        companyId: "company-1",
      };

      mockTenantClient.product.findUnique.mockResolvedValue(existingProduct as any);

      // Product with same SKU but different company
      mockTenantClient.product.findFirst.mockResolvedValue({
        id: "other-product-id",
        code: "SHARED-SKU",
        companyId: "company-2", // Different company
      } as any);

      // Should not throw - different company
      mockTenantClient.product.findFirst.mockResolvedValueOnce(null);
      mockTenantClient.product.update.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      } as any);

      const result = await service.update(mockTenantClient, productId, updateDto, userId);

      expect(result).toBeDefined();
    });
  });

  describe("Product Not Found", () => {
    it("should throw NotFoundException when updating non-existent product", async () => {
      const productId = "non-existent-id";
      const updateDto = { name: "New Name" };

      mockTenantClient.product.findUnique.mockResolvedValue(null);

      await expect(service.update(mockTenantClient, productId, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when getting non-existent product", async () => {
      const productId = "non-existent-id";

      mockTenantClient.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockTenantClient, productId)).rejects.toThrow(NotFoundException);
    });
  });
});
