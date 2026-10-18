import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { CustomersService } from "../customers/customers.service";
import { CreateProductAdjustmentDto } from "./dto/create-product-adjustment.dto";
import { ProductAdjustmentFiltersDto } from "./dto/product-adjustment-filters.dto";
import { ProductAdjustmentsRepository } from "./product-adjustments.repository";
import { ProductAdjustmentDetail } from "./utils/types";

@Injectable()
export class ProductAdjustmentsService {
  constructor(
    private readonly productAdjustmentsRepository: ProductAdjustmentsRepository,
    private readonly customersService: CustomersService,
  ) {}

  async listProductAdjustments(
    productAdjustmentFiltersDto: ProductAdjustmentFiltersDto,
  ): Promise<PaginatedResponse<ProductAdjustmentDetail>> {
    return this.productAdjustmentsRepository.findAll(productAdjustmentFiltersDto);
  }

  async getProductAdjustment(adjustmentId: string): Promise<ProductAdjustmentDetail> {
    return this.checkExistence(adjustmentId);
  }

  async createProductAdjustment(
    createProductAdjustmentDto: CreateProductAdjustmentDto,
    req: RequestWithUser,
  ): Promise<ProductAdjustmentDetail> {
    const { id: loggedInUserId } = req.user;
    const { customerId, productId, type, quantity, reason, notes } = createProductAdjustmentDto;

    await this.customersService.checkExistence(customerId);

    const productExists = await this.productAdjustmentsRepository.findExistingProductId(productId);
    if (!productExists) {
      throw new BadRequestException("Product not found");
    }

    return this.productAdjustmentsRepository.create({
      customerId,
      productId,
      type,
      quantity,
      reason,
      notes: notes ?? null,
      createdById: loggedInUserId,
    });
  }

  async checkExistence(adjustmentId: string): Promise<ProductAdjustmentDetail> {
    const adjustment = await this.productAdjustmentsRepository.findById(adjustmentId);

    if (!adjustment) {
      throw new NotFoundException("Product adjustment not found");
    }

    return adjustment;
  }
}
