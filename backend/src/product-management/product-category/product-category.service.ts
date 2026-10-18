import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ProductCategoryRepository } from "./product-category.repository";
import { ProductCategoryDetail, ProductCategoryListItem } from "./utils/types";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { ProductCategoryFiltersDto } from "./dto/product-category-filters.dto";

@Injectable()
export class ProductCategoryService {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listProductCategories(
    productCategoryFiltersDto: ProductCategoryFiltersDto,
  ): Promise<PaginatedResponse<ProductCategoryListItem>> {
    return this.productCategoryRepository.findAll(productCategoryFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.productCategoryRepository.dropdown();
  }

  async getProductCategory(productCategoryId: string): Promise<ProductCategoryDetail> {
    return this.checkExistence(productCategoryId);
  }

  async createProductCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryDetail> {
    const { name, status } = createProductCategoryDto;

    const payload: Prisma.ProductCategoryCreateInput = {
      name,
      ...(status && { status }),
    };

    try {
      return await this.productCategoryRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A product category with this name already exists");
    }
  }

  async updateProductCategory(
    productCategoryId: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryDetail> {
    const existingProductCategory = await this.checkExistence(productCategoryId);

    this.auditContext.setOldValue(existingProductCategory);
    this.auditContext.setEntityLabel(existingProductCategory.name);

    const { name, status } = updateProductCategoryDto;

    const updateData: Prisma.ProductCategoryUpdateInput = {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.productCategoryRepository.update(productCategoryId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A product category with this name already exists");
    }
  }

  async deleteProductCategory(productCategoryId: string): Promise<void> {
    const existingProductCategory = await this.checkExistence(productCategoryId);

    const isReferencedByProducts =
      await this.productCategoryRepository.hasProductsReferencing(productCategoryId);
    if (isReferencedByProducts) {
      throw new BadRequestException(
        `Cannot delete product category "${existingProductCategory.name}" — it is assigned to one or more products`,
      );
    }

    this.auditContext.setOldValue(existingProductCategory);
    this.auditContext.setEntityLabel(existingProductCategory.name);

    await this.productCategoryRepository.delete(productCategoryId);
  }

  async checkExistence(productCategoryId: string): Promise<ProductCategoryDetail> {
    const productCategory = await this.productCategoryRepository.findById(productCategoryId);

    if (!productCategory) {
      throw new NotFoundException("Product category not found");
    }

    return productCategory;
  }
}
