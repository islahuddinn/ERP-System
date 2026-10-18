import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ProductBonusGroupService } from "../product-bonus-groups/product-bonus-group.service";
import { CreateProductBonusSchemeDto } from "./dto/create-product-bonus-scheme.dto";
import { UpdateProductBonusSchemeDto } from "./dto/update-product-bonus-scheme.dto";
import { ProductBonusSchemeFiltersDto } from "./dto/product-bonus-scheme-filters.dto";
import { ProductBonusSchemeRepository } from "./product-bonus-scheme.repository";
import { ProductBonusSchemeDetail, ProductBonusSchemeListItem } from "./utils/types";

@Injectable()
export class ProductBonusSchemeService {
  constructor(
    private readonly productBonusSchemeRepository: ProductBonusSchemeRepository,
    private readonly productBonusGroupService: ProductBonusGroupService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listProductBonusSchemes(
    productBonusSchemeFiltersDto: ProductBonusSchemeFiltersDto,
  ): Promise<PaginatedResponse<ProductBonusSchemeListItem>> {
    return this.productBonusSchemeRepository.findAll(productBonusSchemeFiltersDto);
  }

  async dropdown(): Promise<
    { id: string; code: string; name: string; productBonusGroupId: string }[]
  > {
    return this.productBonusSchemeRepository.dropdown();
  }

  async getProductBonusScheme(productBonusSchemeId: string): Promise<ProductBonusSchemeDetail> {
    return this.checkExistence(productBonusSchemeId);
  }

  async createProductBonusScheme(
    createProductBonusSchemeDto: CreateProductBonusSchemeDto,
  ): Promise<ProductBonusSchemeDetail> {
    const {
      code,
      name,
      description,
      productBonusGroupId,
      type,
      minPurchaseQty,
      bonusQty,
      validFrom,
      validTo,
      status,
    } = createProductBonusSchemeDto;

    await this.productBonusGroupService.checkExistence(productBonusGroupId);
    this.assertValidDateRange(validFrom, validTo);

    const payload: Prisma.ProductBonusSchemeCreateInput = {
      code,
      name,
      description: description ?? null,
      productBonusGroup: { connect: { id: productBonusGroupId } },
      ...(type && { type }),
      minPurchaseQty,
      bonusQty,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : null,
      ...(status && { status }),
    };

    try {
      return await this.productBonusSchemeRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A product bonus scheme with this code or name already exists");
    }
  }

  async updateProductBonusScheme(
    productBonusSchemeId: string,
    updateProductBonusSchemeDto: UpdateProductBonusSchemeDto,
  ): Promise<ProductBonusSchemeDetail> {
    const existingProductBonusScheme = await this.checkExistence(productBonusSchemeId);

    this.auditContext.setOldValue(existingProductBonusScheme);
    this.auditContext.setEntityLabel(existingProductBonusScheme.name);

    const {
      code,
      name,
      description,
      productBonusGroupId,
      type,
      minPurchaseQty,
      bonusQty,
      validFrom,
      validTo,
      status,
    } = updateProductBonusSchemeDto;

    if (productBonusGroupId) {
      await this.productBonusGroupService.checkExistence(productBonusGroupId);
    }

    const nextValidFrom = validFrom ?? existingProductBonusScheme.validFrom.toISOString().slice(0, 10);
    const nextValidTo =
      validTo !== undefined
        ? validTo || undefined
        : existingProductBonusScheme.validTo?.toISOString().slice(0, 10);
    this.assertValidDateRange(nextValidFrom, nextValidTo);

    const updateData: Prisma.ProductBonusSchemeUpdateInput = {
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description ?? null }),
      ...(productBonusGroupId !== undefined && {
        productBonusGroup: { connect: { id: productBonusGroupId } },
      }),
      ...(type !== undefined && { type }),
      ...(minPurchaseQty !== undefined && { minPurchaseQty }),
      ...(bonusQty !== undefined && { bonusQty }),
      ...(validFrom !== undefined && { validFrom: new Date(validFrom) }),
      ...(validTo !== undefined && { validTo: validTo ? new Date(validTo) : null }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.productBonusSchemeRepository.update(productBonusSchemeId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A product bonus scheme with this code or name already exists");
    }
  }

  async deleteProductBonusScheme(productBonusSchemeId: string): Promise<void> {
    const existingProductBonusScheme = await this.checkExistence(productBonusSchemeId);

    this.auditContext.setOldValue(existingProductBonusScheme);
    this.auditContext.setEntityLabel(existingProductBonusScheme.name);

    await this.productBonusSchemeRepository.delete(productBonusSchemeId);
  }

  async checkExistence(productBonusSchemeId: string): Promise<ProductBonusSchemeDetail> {
    const productBonusScheme =
      await this.productBonusSchemeRepository.findById(productBonusSchemeId);

    if (!productBonusScheme) {
      throw new NotFoundException("Product bonus scheme not found");
    }

    return productBonusScheme;
  }

  async hasSchemesReferencingGroup(productBonusGroupId: string): Promise<boolean> {
    return this.productBonusSchemeRepository.hasSchemesReferencingGroup(productBonusGroupId);
  }

  private assertValidDateRange(validFrom: string, validTo?: string): void {
    const start = new Date(validFrom);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("validFrom must be a valid date");
    }

    if (!validTo) {
      return;
    }

    const end = new Date(validTo);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException("validTo must be a valid date");
    }

    if (end < start) {
      throw new BadRequestException("validTo must be on or after validFrom");
    }
  }
}
