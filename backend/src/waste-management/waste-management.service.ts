import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, WasteItemType, WasteStatus } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { WasteManagementRepository, WASTE_MANAGEMENT_INCLUDE } from "./waste-management.repository";
import { CreateWasteManagementDto, UpdateWasteManagementDto, QueryWasteManagementDto } from "./dto";
import { RequestWithUser } from "../common/interfaces";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../audit/audit-context.service";

type WasteManagementWithRelations = Prisma.WasteManagementGetPayload<{
  include: typeof WASTE_MANAGEMENT_INCLUDE;
}>;

@Injectable()
export class WasteManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wasteManagementRepository: WasteManagementRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(
    createDto: CreateWasteManagementDto,
    req: RequestWithUser,
  ): Promise<WasteManagementWithRelations> {
    const userId = req.user.id;
    this.validateItemReferences(createDto);

    const {
      siteId,
      itemType,
      rawMaterialId,
      productId,
      quantity,
      wasteNumber,
      wasteType,
      reason,
      remarks,
    } = createDto;

    if (siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    }

    let unitCost = 0;

    if (itemType === WasteItemType.PRODUCT) {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, deletedAt: null },
      });

      if (!product) throw new NotFoundException(`Product ${productId} not found`);

      unitCost = Number(product.sellingPrice ?? 0);
    } else {
      const rawMaterial = await this.prisma.rawMaterial.findFirst({
        where: { id: rawMaterialId },
      });

      if (!rawMaterial) throw new NotFoundException(`Raw material ${rawMaterialId} not found`);

      unitCost = Number(rawMaterial.lastPurchasePrice);
    }

    const cost = createDto.cost ?? Number((unitCost * quantity).toFixed(2));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const wasteNumber =
          createDto.wasteNumber ?? (await this.wasteManagementRepository.generateWasteNumber(tx));

        const waste = await this.wasteManagementRepository.create(tx, {
          wasteNumber,
          wasteType,
          itemType,
          productId,
          rawMaterialId,
          quantity,
          cost,
          reason,
          remarks,
          siteId,
          createdById: userId,
        });

        return waste;
      });
    } catch (error) {
      handlePrismaUniqueError(error, `Waste number "${wasteNumber}" already exists`);
    }
  }

  async findAll(
    query: QueryWasteManagementDto,
  ): Promise<PaginatedResponse<WasteManagementWithRelations>> {
    return this.wasteManagementRepository.findAll(query);
  }

  async findOne(wasteId: string): Promise<WasteManagementWithRelations> {
    return this.wasteManagementRepository.findById(wasteId);
  }

  async update(
    wasteId: string,
    updateDto: UpdateWasteManagementDto,
  ): Promise<WasteManagementWithRelations> {
    const waste = await this.wasteManagementRepository.findById(wasteId);

    this.auditContext.setOldValue(waste);
    this.auditContext.setEntityLabel(waste.wasteNumber);

    if (updateDto.status) {
      if (waste.status !== WasteStatus.PENDING) {
        throw new BadRequestException(`Waste record is already resolved as ${waste.status}`);
      }

      if (updateDto.status === WasteStatus.PENDING) {
        throw new BadRequestException(`status must be DISPOSED, RECYCLED or REUSED`);
      }
    }

    return this.wasteManagementRepository.update(wasteId, updateDto);
  }

  async remove(wasteId: string): Promise<{ message: string }> {
    await this.wasteManagementRepository.findById(wasteId);
    await this.wasteManagementRepository.remove(wasteId);
    return { message: "Waste record deleted successfully" };
  }

  private validateItemReferences(dto: CreateWasteManagementDto): void {
    if (dto.itemType === WasteItemType.PRODUCT) {
      if (!dto.productId) {
        throw new BadRequestException(
          `productId is required when itemType is ${WasteItemType.PRODUCT}`,
        );
      }

      if (dto.rawMaterialId) {
        throw new BadRequestException(
          `rawMaterialId must not be set when itemType is ${WasteItemType.PRODUCT}`,
        );
      }
    } else {
      if (!dto.rawMaterialId) {
        throw new BadRequestException(
          `rawMaterialId is required when itemType is ${WasteItemType.RAW_MATERIAL}`,
        );
      }

      if (dto.productId) {
        throw new BadRequestException(
          `productId must not be set when itemType is ${WasteItemType.RAW_MATERIAL}`,
        );
      }
    }
  }
}
