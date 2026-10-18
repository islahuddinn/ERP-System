import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { ProductsRepository } from "./products.repository";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsQueryDto } from "./dto/products-query.dto";
import { RequestWithUser } from "src/common/interfaces";
import { AuditContextService } from "../../audit/audit-context.service";

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(createProductDto: CreateProductDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const { uomId, categoryId, brandId, productGroupId, attributes, images, ...rest } =
      createProductDto;

    this.assertStockRange(rest.minStock, rest.maxStock);
    await Promise.all([
      this.assertUomExists(uomId),
      categoryId ? this.assertCategoryExists(categoryId) : undefined,
      brandId ? this.assertBrandExists(brandId) : undefined,
      productGroupId ? this.assertProductGroupExists(productGroupId) : undefined,
    ]);
    await this.assertCodeUnique(rest.code);
    if (rest.barcode) await this.assertBarcodeUnique(rest.barcode);

    try {
      return await this.productsRepository.create({
        ...rest,
        createdById: userId,
        uom: { connect: { id: uomId } },
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
        ...(productGroupId ? { productGroup: { connect: { id: productGroupId } } } : {}),
        ...(images?.length ? { images } : {}),
        ...(attributes?.length ? { attributes: { create: attributes } } : {}),
      });
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async findAll(productsQueryDto: ProductsQueryDto) {
    return this.productsRepository.findAll(productsQueryDto);
  }

  async findOne(productId: string) {
    const product = await this.productsRepository.findById(productId);
    if (!product) throw new NotFoundException(`Product "${productId}" not found`);
    return product;
  }

  async update(productId: string, updateProductDto: UpdateProductDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const { uomId, categoryId, brandId, productGroupId, attributes, ...rest } = updateProductDto;

    const existing = await this.productsRepository.findById(productId);
    if (!existing) throw new NotFoundException(`Product with ID: "${productId}" not found`);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    // Validate the effective min/max after applying this (possibly partial) update
    // against the current values — #11.
    const effectiveMin = rest.minStock !== undefined ? rest.minStock : existing.minStock;
    const effectiveMax = rest.maxStock !== undefined ? rest.maxStock : existing.maxStock;
    this.assertStockRange(effectiveMin, effectiveMax);

    await Promise.all([
      uomId ? this.assertUomExists(uomId) : undefined,
      categoryId ? this.assertCategoryExists(categoryId) : undefined,
      brandId ? this.assertBrandExists(brandId) : undefined,
      productGroupId ? this.assertProductGroupExists(productGroupId) : undefined,
    ]);
    if (rest.code) await this.assertCodeUnique(rest.code, productId);
    if (rest.barcode) await this.assertBarcodeUnique(rest.barcode, productId);

    const data: Prisma.ProductUpdateInput = {
      ...rest,
      updatedById: userId,
      ...(uomId ? { uom: { connect: { id: uomId } } } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
      ...(productGroupId ? { productGroup: { connect: { id: productGroupId } } } : {}),
      ...(attributes !== undefined ? { attributes: { deleteMany: {}, create: attributes } } : {}),
    };

    try {
      return await this.productsRepository.update(productId, data);
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async remove(productId: string, req: RequestWithUser) {
    const { id: userId } = req.user;

    const existing = await this.productsRepository.findById(productId);
    if (!existing) throw new NotFoundException(`Product with ID: "${productId}" not found`);

    const usedInBom = await this.productsRepository.hasBomReference(productId);
    if (usedInBom) {
      throw new BadRequestException(
        `Cannot delete product "${existing.name}" — it is referenced by one or more Bills of Materials`,
      );
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    await this.productsRepository.softDelete(productId, userId);

    return { message: "Product deleted successfully" };
  }

  async dropdown() {
    return this.productsRepository.dropdown();
  }

  async toggleActive(productId: string, req: RequestWithUser) {
    const { id: userId } = req.user;
    const product = await this.findOne(productId);

    // Block deactivation when the product is linked to BOMs, Production Orders, or Sales.
    if (product.isActive) {
      const isLinked = await this.productsRepository.hasBlockingReferences(productId);
      if (isLinked) {
        throw new BadRequestException(
          "Cannot deactivate a product linked to BOM / Production Orders / Sales.",
        );
      }
    }

    return this.productsRepository.toggleActive(productId, userId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Min stock must never exceed max stock — #11. Null/undefined bounds are ignored. */
  private assertStockRange(
    minStock: number | null | undefined,
    maxStock: number | null | undefined,
  ): void {
    if (
      minStock !== null &&
      minStock !== undefined &&
      maxStock !== null &&
      maxStock !== undefined &&
      minStock > maxStock
    ) {
      throw new BadRequestException("Min stock cannot be greater than max stock");
    }
  }

  private async assertUomExists(uomId: string) {
    const uom = await this.productsRepository.findUomById(uomId);
    if (!uom) throw new NotFoundException(`UOM with ID: '${uomId}' not found`);
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.productsRepository.findCategoryById(categoryId);
    if (!category)
      throw new NotFoundException(`Product category with ID: '${categoryId}' not found`);
  }

  private async assertBrandExists(brandId: string) {
    const brand = await this.productsRepository.findBrandById(brandId);
    if (!brand) throw new NotFoundException(`Product brand with ID: '${brandId}' not found`);
  }

  private async assertProductGroupExists(productGroupId: string) {
    const productGroup = await this.productsRepository.findProductGroupById(productGroupId);
    if (!productGroup) {
      throw new NotFoundException(`Product group with ID: '${productGroupId}' not found`);
    }
  }

  private async assertCodeUnique(code: string, excludeId?: string) {
    const conflict = await this.productsRepository.findByCode(code, excludeId);
    if (conflict) throw new ConflictException(`A product with code "${code}" already exists`);
  }

  private async assertBarcodeUnique(barcode: string, excludeId?: string) {
    const conflict = await this.productsRepository.findByBarcode(barcode, excludeId);
    if (conflict) throw new ConflictException(`A product with barcode "${barcode}" already exists`);
  }
}
