import { Test, TestingModule } from "@nestjs/testing";
import { CompaniesService } from "./companies.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";

describe("CompaniesService", () => {
  let service: CompaniesService;
  let mockTenantClient: any;

  beforeEach(async () => {
    mockTenantClient = {
      company: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesService],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  describe("create", () => {
    const userId = "test-user-id";

    it("should create a company successfully", async () => {
      const companyData = { name: "Test Company", code: "TEST001" };

      mockTenantClient.company.findFirst.mockResolvedValue(null);
      mockTenantClient.company.create.mockResolvedValue({
        id: "company-id",
        ...companyData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        mockTenantClient,
        companyData.name,
        companyData.code,
        userId,
      );

      expect(result.name).toBe(companyData.name);
      expect(result.code).toBe(companyData.code);
      expect(mockTenantClient.company.create).toHaveBeenCalledWith({
        data: {
          name: companyData.name,
          code: companyData.code,
          createdById: userId,
          updatedById: userId,
        },
      });
    });

    it("should throw ConflictException when company name already exists", async () => {
      const companyData = { name: "Existing Company", code: "EXIST001" };

      mockTenantClient.company.findFirst.mockResolvedValue({
        id: "existing-id",
        name: companyData.name,
      });

      await expect(
        service.create(mockTenantClient, companyData.name, companyData.code, userId),
      ).rejects.toThrow(ConflictException);
    });

    it("should create company without code", async () => {
      const companyData = { name: "Test Company" };

      mockTenantClient.company.findFirst.mockResolvedValue(null);
      mockTenantClient.company.create.mockResolvedValue({
        id: "company-id",
        name: companyData.name,
        code: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(mockTenantClient, companyData.name, undefined, userId);

      expect(result.name).toBe(companyData.name);
      expect(mockTenantClient.company.create).toHaveBeenCalledWith({
        data: {
          name: companyData.name,
          code: undefined,
          createdById: userId,
          updatedById: userId,
        },
      });
    });
  });

  describe("findOne", () => {
    it("should return company when found", async () => {
      const companyId = "company-id";
      const mockCompany = {
        id: companyId,
        name: "Test Company",
        code: "TEST001",
        isActive: true,
      };

      mockTenantClient.company.findUnique.mockResolvedValue(mockCompany as any);

      const result = await service.findOne(mockTenantClient, companyId);

      expect(result).toEqual(mockCompany);
      expect(mockTenantClient.company.findUnique).toHaveBeenCalledWith({
        where: { id: companyId },
      });
    });

    it("should throw NotFoundException when company not found", async () => {
      const companyId = "non-existent-id";

      mockTenantClient.company.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockTenantClient, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    const userId = "test-user-id";
    const companyId = "company-id";

    it("should update company successfully", async () => {
      const existingCompany = {
        id: companyId,
        name: "Old Name",
        code: "OLD001",
      };
      const updateData = { name: "New Name" };

      mockTenantClient.company.findUnique.mockResolvedValue(existingCompany as any);
      mockTenantClient.company.findFirst.mockResolvedValue(null);
      mockTenantClient.company.update.mockResolvedValue({
        ...existingCompany,
        ...updateData,
      } as any);

      const result = await service.update(mockTenantClient, companyId, updateData, userId);

      expect(result.name).toBe(updateData.name);
      expect(mockTenantClient.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: {
          ...updateData,
          updatedById: userId,
        },
      });
    });

    it("should throw ConflictException when new name conflicts", async () => {
      const existingCompany = {
        id: companyId,
        name: "Old Name",
      };
      const updateData = { name: "Conflicting Name" };

      mockTenantClient.company.findUnique.mockResolvedValue(existingCompany as any);
      mockTenantClient.company.findFirst.mockResolvedValue({
        id: "other-id",
        name: updateData.name,
      });

      await expect(service.update(mockTenantClient, companyId, updateData, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("softDelete", () => {
    const companyId = "company-id";

    it("should delete company when no products exist", async () => {
      const existingCompany = {
        id: companyId,
        name: "Test Company",
      };

      mockTenantClient.company.findUnique.mockResolvedValue(existingCompany as any);
      mockTenantClient.product.findMany.mockResolvedValue([]);
      mockTenantClient.company.delete.mockResolvedValue(existingCompany as any);

      const result = await service.softDelete(mockTenantClient, companyId);

      expect(result.message).toBe("Company deleted successfully");
      expect(mockTenantClient.company.delete).toHaveBeenCalledWith({
        where: { id: companyId },
      });
    });

    it("should throw ConflictException when company has products", async () => {
      const existingCompany = {
        id: companyId,
        name: "Test Company",
      };

      mockTenantClient.company.findUnique.mockResolvedValue(existingCompany as any);
      mockTenantClient.product.findMany.mockResolvedValue([
        { id: "product-1", name: "Product 1" },
      ] as any);

      await expect(service.softDelete(mockTenantClient, companyId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
