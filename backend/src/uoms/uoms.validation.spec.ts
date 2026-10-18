import { Test, TestingModule } from "@nestjs/testing";
import { UOMsService } from "./uoms.service";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { CreateUOMDto } from "./dto/create-uom.dto";
import { UomCategory } from "./utils/enums";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";

describe("UOMsService - Validation Tests", () => {
  let service: UOMsService;
  let mockUomModel: any;
  const userId = "test-user-id";

  const baseDto: CreateUOMDto = {
    name: "Kilogram",
    symbol: "kg",
    code: "KILOGRAM",
    category: UomCategory.WEIGHT,
  };

  beforeEach(async () => {
    mockUomModel = {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    };

    const mockTenantPrismaContext = {
      getTenantClient: jest.fn().mockReturnValue({ uOM: mockUomModel }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UOMsService,
        { provide: TenantPrismaContextService, useValue: mockTenantPrismaContext },
      ],
    }).compile();

    service = module.get<UOMsService>(UOMsService);
  });

  describe("create", () => {
    it("should reject duplicate code", async () => {
      mockUomModel.findUnique.mockResolvedValue({ id: "existing-id", code: "KILOGRAM" });

      await expect(service.create(baseDto, userId)).rejects.toThrow(ConflictException);
    });

    it("should create UOM when code is unique", async () => {
      mockUomModel.findUnique.mockResolvedValue(null);
      mockUomModel.create.mockResolvedValue({ id: "new-id", ...baseDto, isSystem: false });

      const result = await service.create(baseDto, userId);

      expect(result.code).toBe("KILOGRAM");
    });
  });

  describe("remove", () => {
    it("should block deletion of system UOMs", async () => {
      mockUomModel.findUnique.mockResolvedValue({
        id: "uom-id",
        isSystem: true,
        _count: { products: 0, rawMaterials: 0 },
      });

      await expect(service.remove("uom-id")).rejects.toThrow(ForbiddenException);
    });

    it("should block deletion when UOM is in use by products", async () => {
      mockUomModel.findUnique.mockResolvedValue({
        id: "uom-id",
        isSystem: false,
        _count: { products: 3, rawMaterials: 0 },
      });

      await expect(service.remove("uom-id")).rejects.toThrow(ConflictException);
    });

    it("should block deletion when UOM is in use by raw materials", async () => {
      mockUomModel.findUnique.mockResolvedValue({
        id: "uom-id",
        isSystem: false,
        _count: { products: 0, rawMaterials: 2 },
      });

      await expect(service.remove("uom-id")).rejects.toThrow(ConflictException);
    });

    it("should allow deletion of unused non-system UOM", async () => {
      mockUomModel.findUnique.mockResolvedValue({
        id: "uom-id",
        isSystem: false,
        _count: { products: 0, rawMaterials: 0 },
      });
      mockUomModel.delete.mockResolvedValue({ id: "uom-id" });

      const result = await service.remove("uom-id");

      expect(result.message).toBe("UOM deleted successfully");
    });
  });
});
