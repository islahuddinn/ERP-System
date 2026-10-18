import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { LocationsRepository } from "./locations.repository";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationsQueryDto } from "./dto/locations-query.dto";
import { RequestWithUser } from "src/common/interfaces";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class LocationsService {
  constructor(
    private readonly locationsRepository: LocationsRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(dto: CreateLocationDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    await this.assertNameUnique(dto.name);

    // #24 — address column is now nullable; persist null when none is supplied
    // (rather than forcing an empty string) so it round-trips cleanly.
    return this.locationsRepository.create({ ...dto, address: dto.address ?? null, createdById: userId });
  }

  async findAll(query: LocationsQueryDto) {
    return this.locationsRepository.findAll(query);
  }

  async findOne(id: string) {
    const location = await this.locationsRepository.findById(id);
    if (!location) throw new NotFoundException(`Location "${id}" not found`);
    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    const existing = await this.findOne(id);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    if (dto.name) await this.assertNameUnique(dto.name, id);

    return this.locationsRepository.update(id, dto);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    const hasStock = await this.locationsRepository.hasStockBalances(id);
    if (hasStock) {
      throw new ConflictException("Cannot delete location with existing stock balances");
    }

    try {
      await this.locationsRepository.remove(id);
    } catch (error) {
      // Foreign-key violation: the location is still referenced by another
      // module (e.g. Sites). Surface a clear, user-friendly message instead of
      // the raw Prisma "Invalid locationId not exist" error.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("Location cannot be deleted because it is linked with other modules.");
      }
      throw error;
    }

    return { message: "Location deleted successfully" };
  }

  async dropdown() {
    return this.locationsRepository.dropdown();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertNameUnique(name: string, excludeId?: string) {
    const existing = await this.locationsRepository.findByName(name, excludeId);
    if (existing) throw new ConflictException(`Location with name "${name}" already exists`);
  }

  private async checkExistence(id: string) {
    const exists = await this.locationsRepository.checkExistence(id);
    if (!exists) throw new NotFoundException(`Location with ID "${id}" not found`);
  }
}
