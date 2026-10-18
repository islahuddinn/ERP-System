import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { CreateProductBonusGroupDto } from "./dto/create-product-bonus-group.dto";
import { UpdateProductBonusGroupDto } from "./dto/update-product-bonus-group.dto";
import { ProductBonusGroupFiltersDto } from "./dto/product-bonus-group-filters.dto";
import { ProductBonusGroupRepository } from "./product-bonus-group.repository";
import { ProductBonusGroupDetail, ProductBonusGroupListItem } from "./utils/types";

@Injectable()
export class ProductBonusGroupService {
  constructor(
    private readonly productBonusGroupRepository: ProductBonusGroupRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listProductBonusGroups(
    productBonusGroupFiltersDto: ProductBonusGroupFiltersDto,
  ): Promise<PaginatedResponse<ProductBonusGroupListItem>> {
    return this.productBonusGroupRepository.findAll(productBonusGroupFiltersDto);
  }

  async dropdown(): Promise<{ id: string; code: string; name: string }[]> {
    return this.productBonusGroupRepository.dropdown();
  }

  async getProductBonusGroup(productBonusGroupId: string): Promise<ProductBonusGroupDetail> {
    return this.checkExistence(productBonusGroupId);
  }

  async createProductBonusGroup(
    createProductBonusGroupDto: CreateProductBonusGroupDto,
  ): Promise<ProductBonusGroupDetail> {
    const { code, name, description, status, productIds } = createProductBonusGroupDto;

    await this.assertValidProductIds(productIds);

    try {
      return await this.productBonusGroupRepository.create({
        code,
        name,
        description: description ?? null,
        status,
        productIds,
      });
    } catch (error) {
      handlePrismaUniqueError(
        error,
        "A product bonus group with this code or name already exists",
      );
    }
  }

  async updateProductBonusGroup(
    productBonusGroupId: string,
    updateProductBonusGroupDto: UpdateProductBonusGroupDto,
  ): Promise<ProductBonusGroupDetail> {
    const existingProductBonusGroup = await this.checkExistence(productBonusGroupId);

    this.auditContext.setOldValue(existingProductBonusGroup);
    this.auditContext.setEntityLabel(existingProductBonusGroup.name);

    const { code, name, description, status, productIds } = updateProductBonusGroupDto;

    if (productIds !== undefined) {
      await this.assertValidProductIds(productIds);
    }

    try {
      return await this.productBonusGroupRepository.update(productBonusGroupId, {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description ?? null }),
        ...(status !== undefined && { status }),
        ...(productIds !== undefined && { productIds }),
      });
    } catch (error) {
      handlePrismaUniqueError(
        error,
        "A product bonus group with this code or name already exists",
      );
    }
  }

  async deleteProductBonusGroup(productBonusGroupId: string): Promise<void> {
    const existingProductBonusGroup = await this.checkExistence(productBonusGroupId);

    const isReferencedBySchemes =
      await this.productBonusGroupRepository.hasSchemesReferencing(productBonusGroupId);
    if (isReferencedBySchemes) {
      throw new BadRequestException(
        `Cannot delete product bonus group "${existingProductBonusGroup.name}" — one or more bonus schemes reference it`,
      );
    }

    this.auditContext.setOldValue(existingProductBonusGroup);
    this.auditContext.setEntityLabel(existingProductBonusGroup.name);

    await this.productBonusGroupRepository.delete(productBonusGroupId);
  }

  async checkExistence(productBonusGroupId: string): Promise<ProductBonusGroupDetail> {
    const productBonusGroup =
      await this.productBonusGroupRepository.findById(productBonusGroupId);

    if (!productBonusGroup) {
      throw new NotFoundException("Product bonus group not found");
    }

    return productBonusGroup;
  }

  private async assertValidProductIds(productIds: string[]): Promise<void> {
    const uniqueProductIds = [...new Set(productIds)];

    if (!uniqueProductIds.length) {
      throw new BadRequestException("At least one product is required");
    }

    const existingProductIds =
      await this.productBonusGroupRepository.findExistingProductIds(uniqueProductIds);

    if (existingProductIds.length !== uniqueProductIds.length) {
      throw new BadRequestException("One or more selected products were not found");
    }
  }
}
