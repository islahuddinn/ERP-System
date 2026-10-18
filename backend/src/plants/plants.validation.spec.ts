import { Test, TestingModule } from "@nestjs/testing";
import { PlantsService } from "./plants.service";
import { PlantsRepository } from "./plants.repository";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { CreatePlantDto } from "./dto/plant.dto";

describe("PlantsService - Validation Tests", () => {
  let service: PlantsService;
  let repository: PlantsRepository;
  let mockTenantClient: any;
  const userId = "test-user-id";

  beforeEach(async () => {
    mockTenantClient = {
      location: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      plant: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      productionLine: {
        findMany: jest.fn(),
      },
      machine: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    } as any;

    const mockRepository = {
      validateLocation: jest.fn(),
      validateManager: jest.fn(),
      validatePlantCode: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantsService,
        {
          provide: PlantsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
    repository = module.get<PlantsRepository>(PlantsRepository);
  });

  describe("Plant Code Uniqueness", () => {
    it("should reject duplicate plant code", async () => {
      const createDto: CreatePlantDto = {
        name: "Plant A",
        code: "PLANT-001",
        locationId: "location-id",
        plantType: "MANUFACTURING" as any,
        capacity: "LARGE" as any,
        address: "123 Main St",
      };

      jest.spyOn(repository, "validateLocation").mockResolvedValue({ id: "location-id" } as any);
      jest.spyOn(repository, "validatePlantCode").mockResolvedValue({
        id: "existing-plant-id",
        code: "PLANT-001",
      } as any);

      await expect(service.create(mockTenantClient, createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("Location Validation", () => {
    it("should reject plant creation with invalid location", async () => {
      const createDto: CreatePlantDto = {
        name: "Plant A",
        code: "PLANT-001",
        locationId: "invalid-location-id",
        plantType: "MANUFACTURING" as any,
        capacity: "LARGE" as any,
        address: "123 Main St",
      };

      jest.spyOn(repository, "validateLocation").mockResolvedValue(null);

      await expect(service.create(mockTenantClient, createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("Plant Deletion Prevention", () => {
    it("should reject deletion when plant has production lines", async () => {
      const plantId = "plant-id";

      jest.spyOn(repository, "findOne").mockResolvedValue({
        id: plantId,
        name: "Test Plant",
      } as any);

      mockTenantClient.productionLine.findMany.mockResolvedValue([
        { id: "line-1", name: "Line 1" },
      ] as any);

      await expect(service.remove(mockTenantClient, plantId)).rejects.toThrow(ConflictException);
    });

    it("should reject deletion when plant has machines", async () => {
      const plantId = "plant-id";

      jest.spyOn(repository, "findOne").mockResolvedValue({
        id: plantId,
        name: "Test Plant",
      } as any);

      mockTenantClient.productionLine.findMany.mockResolvedValue([]);
      mockTenantClient.machine.findMany.mockResolvedValue([
        { id: "machine-1", name: "Machine 1" },
      ] as any);

      await expect(service.remove(mockTenantClient, plantId)).rejects.toThrow(ConflictException);
    });

    it("should allow deletion when plant has no dependencies", async () => {
      const plantId = "plant-id";

      jest.spyOn(repository, "findOne").mockResolvedValue({
        id: plantId,
        name: "Test Plant",
      } as any);

      mockTenantClient.productionLine.findMany.mockResolvedValue([]);
      mockTenantClient.machine.findMany.mockResolvedValue([]);
      mockTenantClient.$queryRaw.mockResolvedValue([{ count: 0 }]);

      jest.spyOn(repository, "remove").mockResolvedValue({
        id: plantId,
      } as any);

      const result = await service.remove(mockTenantClient, plantId);

      expect(result).toBeDefined();
    });
  });
});
