import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { DistributionPricingMode, PriceListTier } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { ProductsService } from "../../product-management/products/products.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { BranchService } from "../branch/branch.service";
import { PriceListsService } from "../price-lists/price-lists.service";
import { BranchProductPricesRepository } from "./branch-product-prices.repository";
import { UpsertBranchProductPriceDto } from "./dto/upsert-branch-product-price.dto";
import { BranchProductPriceFiltersDto } from "./dto/branch-product-price-filters.dto";
import { BranchProductPriceDetail } from "./utils/types";
import { RequestWithUser } from "../../common/interfaces";
import { PermissionsService } from "../../users/permissions/permissions.service";

@Injectable()
export class BranchProductPricesService {
  constructor(
    private readonly branchProductPricesRepository: BranchProductPricesRepository,
    private readonly productsService: ProductsService,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly priceListsService: PriceListsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // A price list is private to its owner and that owner's own buyers —
  // nobody else may view it, no exceptions (not even a caller who isn't
  // tied to any branch — getBranchForDistributor rejects them outright).
  // "Buyer" means: my own list (I set it), or my parent branch's list (the
  // seller I actually buy from — the Factory's, if I have no parent). A
  // sibling branch's list, a child's list, or any other branch's list is
  // always off-limits.
  async listBranchProductPrices(
    branchProductPriceFiltersDto: BranchProductPriceFiltersDto,
    req: RequestWithUser,
  ): Promise<PaginatedResponse<BranchProductPriceDetail>> {
    const { id: loggedInUserId } = req.user;
    const { sellerBranchId } = branchProductPriceFiltersDto;

    const canViewFactoryPrices = await this.permissionsService.hasPermission(
      loggedInUserId,
      "branch-product-price.manage-factory",
    );
    if (canViewFactoryPrices && !sellerBranchId) {
      return this.branchProductPricesRepository.findAll(branchProductPriceFiltersDto);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const myBranch = await this.branchService.getBranchForDistributor(loggedInEmployeeId);

    const requestedSellerBranchId = sellerBranchId ?? null;
    const isMyOwnList = requestedSellerBranchId === myBranch.id;
    const isMySellersList = requestedSellerBranchId === myBranch.parentBranchId;

    if (!isMyOwnList && !isMySellersList) {
      throw new ForbiddenException(
        "You can only view your own branch's price list, or your parent branch's (seller's) price list",
      );
    }

    return this.branchProductPricesRepository.findAll(branchProductPriceFiltersDto);
  }

  // Sets the caller's own branch's standard price for a product — the
  // caller's branch is whichever branch has them as its distributor.
  async setMyPrice(
    upsertBranchProductPriceDto: UpsertBranchProductPriceDto,
    req: RequestWithUser,
  ): Promise<BranchProductPriceDetail> {
    const { id: loggedInUserId } = req.user;
    const { productId, price } = upsertBranchProductPriceDto;

    await this.assertFreePricingMode();
    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const myBranch = await this.branchService.getBranchForDistributor(loggedInEmployeeId);
    await this.productsService.findOne(productId);

    return this.branchProductPricesRepository.upsert({
      sellerBranchId: myBranch.id,
      productId,
      price,
    });
  }

  // Sets the Factory's standard price for a product — gated by a separate
  // permission (branch-product-price.manage-factory) since there is no
  // Branch row for the Factory to check ownership against.
  async setFactoryPrice(
    upsertBranchProductPriceDto: UpsertBranchProductPriceDto,
  ): Promise<BranchProductPriceDetail> {
    const { productId, price } = upsertBranchProductPriceDto;

    await this.assertFreePricingMode();
    await this.productsService.findOne(productId);

    return this.branchProductPricesRepository.upsert({
      sellerBranchId: null,
      productId,
      price,
    });
  }

  // Branch/Factory prices (this whole table) are only ever read by
  // resolvePrice() under FREE_PRICE mode — FIXED_PRICE ignores sellerBranchId
  // completely and always uses the buyer's tier from price-lists instead.
  // Writing here while FIXED_PRICE is active would silently succeed and then
  // never take effect, so it's blocked outright rather than left as a
  // confusing no-op.
  private async assertFreePricingMode(): Promise<void> {
    const pricingMode = await this.branchProductPricesRepository.getPricingMode();

    if (pricingMode === DistributionPricingMode.FIXED_PRICE) {
      throw new BadRequestException(
        "Cannot set a branch/Factory price while the company's pricing mode is FIXED_PRICE — every " +
          "price is determined by the buyer's tier in the company price lists instead (see " +
          "/sales-management/price-lists). Switch the pricing mode to FREE_PRICE first if you want " +
          "sellers to set their own prices.",
      );
    }
  }

  // The single place price resolution happens for every sale in the whole
  // network — branch buying from branch, or a Sales Person's customer
  // order. Which of the two rules below applies depends only on the
  // company-wide Settings.distributionPricingMode:
  //
  //   FIXED_PRICE — the price is whatever the 4 company price lists say for
  //   the buyer's own tier. Nobody types a number, sellerBranchId and
  //   requestedPrice are both ignored completely — see PriceListsService.
  //
  //   FREE_PRICE — the seller sets their own price per transaction. If they
  //   didn't type one, their own standard price list is used instead.
  async resolvePrice(
    productId: string,
    buyerTier: PriceListTier | null,
    sellerBranchId: string | null,
    requestedPrice?: number,
  ): Promise<number> {
    const pricingMode = await this.branchProductPricesRepository.getPricingMode();

    if (pricingMode === DistributionPricingMode.FIXED_PRICE) {
      if (!buyerTier) {
        throw new BadRequestException(
          "This buyer hasn't been assigned a price tier yet — set one before buying stock",
        );
      }

      return this.priceListsService.getPrice(buyerTier, productId);
    }

    if (requestedPrice !== undefined) {
      return requestedPrice;
    }

    const listedPrice = await this.branchProductPricesRepository.findPrice(
      sellerBranchId,
      productId,
    );

    if (listedPrice === null) {
      throw new BadRequestException(
        "No price was entered and this seller has no standard price set for this product",
      );
    }

    return listedPrice;
  }
}
