import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { RawMaterialsRepository } from "./raw-materials.repository";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { UpdateRawMaterialDto } from "./dto/update-raw-material.dto";
import { RawMaterialQueryDto } from "./dto/raw-material-query.dto";
import { RequestWithUser } from "src/common/interfaces";
import { AuditContextService } from "../audit/audit-context.service";
@Injectable()
export class RawMaterialsService {
  constructor(
    private readonly rawMaterialsRepository: RawMaterialsRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(dto: CreateRawMaterialDto, req: RequestWithUser) {
    try {
      const { id: userId } = req.user;
      const { uomId, ...rest } = dto;

      const rawMaterial = await this.rawMaterialsRepository.create({
        ...rest,
        createdById: userId,
        uom: { connect: { id: uomId } },
      });

      return rawMaterial;
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async findAll(rawMaterialQueryDto: RawMaterialQueryDto) {
    return this.rawMaterialsRepository.findAll(rawMaterialQueryDto);
  }

  async findOne(rawMaterialId: string) {
    const rawMaterial = await this.rawMaterialsRepository.findById(rawMaterialId);

    if (!rawMaterial) {
      throw new NotFoundException(`Raw material with ID "${rawMaterialId}" not found`);
    }

    return rawMaterial;
  }

  async update(
    rawMaterialId: string,
    updateRawMaterialDto: UpdateRawMaterialDto,
    req: RequestWithUser,
  ) {
    const { id: userId } = req.user;

    const existing = await this.findOne(rawMaterialId);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    // A cleared last price arrives as null; the column is a non-nullable Decimal,
    // so persist 0. The UI renders a 0 last price as an empty field — #7.
    const { lastPurchasePrice, ...rest } = updateRawMaterialDto;

    try {
      return await this.rawMaterialsRepository.update(rawMaterialId, {
        ...rest,
        ...(lastPurchasePrice === undefined
          ? {}
          : { lastPurchasePrice: lastPurchasePrice ?? 0 }),
        updatedById: userId,
      });
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async remove(rawMaterialId: string) {
    const existing = await this.findOne(rawMaterialId);

    const reason = await this.rawMaterialsRepository.checkReferences(rawMaterialId);
    if (reason) {
      throw new BadRequestException(reason);
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    await this.rawMaterialsRepository.hardDelete(rawMaterialId);

    return { message: "Raw material deleted successfully" };
  }

  async dropdown() {
    return this.rawMaterialsRepository.dropdown();
  }
}
