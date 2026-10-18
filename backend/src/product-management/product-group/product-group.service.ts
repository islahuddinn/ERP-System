import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ProductGroupRepository } from "./product-group.repository";
import { ProductGroupDetail, ProductGroupListItem } from "./utils/types";
import { CreateProductGroupDto } from "./dto/create-product-group.dto";
import { UpdateProductGroupDto } from "./dto/update-product-group.dto";
import { ProductGroupFiltersDto } from "./dto/product-group-filters.dto";

@Injectable()
export class ProductGroupService {
  constructor(
    private readonly productGroupRepository: ProductGroupRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listProductGroups(
    productGroupFiltersDto: ProductGroupFiltersDto,
  ): Promise<PaginatedResponse<ProductGroupListItem>> {
    return this.productGroupRepository.findAll(productGroupFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.productGroupRepository.dropdown();
  }

  async getProductGroup(productGroupId: string): Promise<ProductGroupDetail> {
    return this.checkExistence(productGroupId);
  }

  async createProductGroup(
    createProductGroupDto: CreateProductGroupDto,
  ): Promise<ProductGroupDetail> {
    const { name, status } = createProductGroupDto;

    const payload: Prisma.ProductGroupCreateInput = {
      name,
      ...(status && { status }),
    };

    try {
      return await this.productGroupRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A product group with this name already exists");
    }
  }

  async updateProductGroup(
    productGroupId: string,
    updateProductGroupDto: UpdateProductGroupDto,
  ): Promise<ProductGroupDetail> {
    const existingProductGroup = await this.checkExistence(productGroupId);

    this.auditContext.setOldValue(existingProductGroup);
    this.auditContext.setEntityLabel(existingProductGroup.name);

    const { name, status } = updateProductGroupDto;

    const updateData: Prisma.ProductGroupUpdateInput = {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.productGroupRepository.update(productGroupId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A product group with this name already exists");
    }
  }

  async deleteProductGroup(productGroupId: string): Promise<void> {
    const existingProductGroup = await this.checkExistence(productGroupId);

    const isReferencedByProducts =
      await this.productGroupRepository.hasProductsReferencing(productGroupId);
    if (isReferencedByProducts) {
      throw new BadRequestException(
        `Cannot delete product group "${existingProductGroup.name}" — it is assigned to one or more products`,
      );
    }

    const isReferencedByBranches =
      await this.productGroupRepository.hasBranchesReferencing(productGroupId);
    if (isReferencedByBranches) {
      throw new BadRequestException(
        `Cannot delete product group "${existingProductGroup.name}" — it is assigned to one or more branches`,
      );
    }

    this.auditContext.setOldValue(existingProductGroup);
    this.auditContext.setEntityLabel(existingProductGroup.name);

    await this.productGroupRepository.delete(productGroupId);
  }

  async checkExistence(productGroupId: string): Promise<ProductGroupDetail> {
    const productGroup = await this.productGroupRepository.findById(productGroupId);

    if (!productGroup) {
      throw new NotFoundException("Product group not found");
    }

    return productGroup;
  }
}
