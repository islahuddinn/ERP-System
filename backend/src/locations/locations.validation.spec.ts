import { Test, TestingModule } from "@nestjs/testing";
import { LocationsService } from "./locations.service";
import { LocationsRepository } from "./locations.repository";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CreateLocationDto } from "./dto/create-location.dto";
import { RequestWithUser } from "src/common/interfaces";

const mockRequest = (userId = "test-user-id") =>
  ({ user: { id: userId } }) as unknown as RequestWithUser;

describe("LocationsService - Validation Tests", () => {
  let service: LocationsService;
  let repo: jest.Mocked<LocationsRepository>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      checkExistence: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      bulkDelete: jest.fn(),
      hasStockBalances: jest.fn(),
      locationsWithStockBalances: jest.fn(),
      dropdown: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: LocationsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    repo = module.get(LocationsRepository);
  });

  describe("Location Name Uniqueness", () => {
    it("should reject duplicate location name on create", async () => {
      const createDto: CreateLocationDto = { name: "Main Warehouse" };
      repo.findByName.mockResolvedValue({ id: "existing-id" } as any);

      await expect(service.create(createDto, mockRequest())).rejects.toThrow(ConflictException);
    });

    it("should create location with unique name", async () => {
      const createDto: CreateLocationDto = { name: "New Warehouse" };
      repo.findByName.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: "location-id", name: "New Warehouse" } as any);

      const result = await service.create(createDto, mockRequest());
      expect(result.name).toBe(createDto.name);
    });
  });

  describe("Location Deletion Validation", () => {
    it("should reject deletion when location has stock balances", async () => {
      const locationId = "location-id";
      repo.checkExistence.mockResolvedValue(true);
      repo.hasStockBalances.mockResolvedValue(true);

      await expect(service.remove(locationId)).rejects.toThrow(ConflictException);
    });

    it("should allow deletion when location has no stock", async () => {
      const locationId = "location-id";
      repo.checkExistence.mockResolvedValue(true);
      repo.hasStockBalances.mockResolvedValue(false);
      repo.remove.mockResolvedValue({ id: locationId } as any);

      const result = await service.remove(locationId);
      expect(result.message).toBe("Location deleted successfully");
    });

    it("should throw NotFoundException when location does not exist", async () => {
      repo.checkExistence.mockResolvedValue(false);

      await expect(service.remove("non-existent-id")).rejects.toThrow(NotFoundException);
    });
  });
});
