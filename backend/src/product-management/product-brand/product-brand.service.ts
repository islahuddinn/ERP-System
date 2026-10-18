import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ProductBrandRepository } from "./product-brand.repository";
import { ProductBrandDetail, ProductBrandListItem } from "./utils/types";
import { CreateProductBrandDto } from "./dto/create-product-brand.dto";
import { UpdateProductBrandDto } from "./dto/update-product-brand.dto";
import { ProductBrandFiltersDto } from "./dto/product-brand-filters.dto";

@Injectable()
export class ProductBrandService {
  constructor(
    private readonly productBrandRepository: ProductBrandRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listProductBrands(
    productBrandFiltersDto: ProductBrandFiltersDto,
  ): Promise<PaginatedResponse<ProductBrandListItem>> {
    return this.productBrandRepository.findAll(productBrandFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.productBrandRepository.dropdown();
  }

  async getProductBrand(productBrandId: string): Promise<ProductBrandDetail> {
    return this.checkExistence(productBrandId);
  }

  async createProductBrand(
    createProductBrandDto: CreateProductBrandDto,
  ): Promise<ProductBrandDetail> {
    const { name, status } = createProductBrandDto;

    const payload: Prisma.ProductBrandCreateInput = {
      name,
      ...(status && { status }),
    };

    try {
      return await this.productBrandRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A product brand with this name already exists");
    }
  }

  async updateProductBrand(
    productBrandId: string,
    updateProductBrandDto: UpdateProductBrandDto,
  ): Promise<ProductBrandDetail> {
    const existingProductBrand = await this.checkExistence(productBrandId);

    this.auditContext.setOldValue(existingProductBrand);
    this.auditContext.setEntityLabel(existingProductBrand.name);

    const { name, status } = updateProductBrandDto;

    const updateData: Prisma.ProductBrandUpdateInput = {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.productBrandRepository.update(productBrandId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A product brand with this name already exists");
    }
  }

  async deleteProductBrand(productBrandId: string): Promise<void> {
    const existingProductBrand = await this.checkExistence(productBrandId);

    const isReferencedByProducts =
      await this.productBrandRepository.hasProductsReferencing(productBrandId);
    if (isReferencedByProducts) {
      throw new BadRequestException(
        `Cannot delete product brand "${existingProductBrand.name}" — it is assigned to one or more products`,
      );
    }

    this.auditContext.setOldValue(existingProductBrand);
    this.auditContext.setEntityLabel(existingProductBrand.name);

    await this.productBrandRepository.delete(productBrandId);
  }

  async checkExistence(productBrandId: string): Promise<ProductBrandDetail> {
    const productBrand = await this.productBrandRepository.findById(productBrandId);

    if (!productBrand) {
      throw new NotFoundException("Product brand not found");
    }

    return productBrand;
  }
}
