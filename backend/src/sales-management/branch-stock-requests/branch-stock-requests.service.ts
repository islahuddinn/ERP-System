import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { ProductsService } from "../../product-management/products/products.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { BranchService } from "../branch/branch.service";
import { BranchProductPricesService } from "../branch-product-prices/branch-product-prices.service";
import { BranchStockTransferDetail } from "../branch-stock-transfers/utils/types";
import { BranchStockRequestsRepository } from "./branch-stock-requests.repository";
import { CreateBranchStockRequestDto } from "./dto/create-branch-stock-request.dto";
import { CreateBranchStockRequestTransferDto } from "./dto/create-branch-stock-request-transfer.dto";
import { BranchStockRequestFiltersDto } from "./dto/branch-stock-request-filters.dto";
import { BranchStockRequestDetail, BranchStockRequestListItem } from "./utils/types";
import { BranchStockRequestStatus } from "./utils/enums";

@Injectable()
export class BranchStockRequestsService {
  constructor(
    private readonly branchStockRequestsRepository: BranchStockRequestsRepository,
    private readonly productsService: ProductsService,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly branchProductPricesService: BranchProductPricesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async listBranchStockRequests(
    branchStockRequestFiltersDto: BranchStockRequestFiltersDto,
  ): Promise<PaginatedResponse<BranchStockRequestListItem>> {
    return this.branchStockRequestsRepository.findAll(branchStockRequestFiltersDto);
  }

  async getBranchStockRequest(requestId: string): Promise<BranchStockRequestDetail> {
    return this.checkExistence(requestId);
  }

  /**
   * The requester is always the caller's own branch, and the fulfiller is
   * always that branch's parent (null when the branch is top-level, meaning
   * it requests from the Factory) — both resolved server-side, never taken
   * from the request body.
   *
   * Pricing is resolved here too, all-or-nothing: every item must get a
   * price (FIXED_PRICE company list, or the fulfiller's own standard price
   * under FREE_PRICE) or the whole request is rejected — a request is never
   * created half-priced. That price is then frozen onto the item; nothing
   * downstream (approval, shipping) ever touches pricing again.
   */
  async createBranchStockRequest(
    createBranchStockRequestDto: CreateBranchStockRequestDto,
    req: RequestWithUser,
  ): Promise<BranchStockRequestDetail> {
    const { id: loggedInUserId } = req.user;
    const { items, notes } = createBranchStockRequestDto;

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const myBranch = await this.branchService.getBranchForDistributor(loggedInEmployeeId);

    const products = await Promise.all(
      [...new Set(items.map((item) => item.productId))].map((productId) =>
        this.productsService.findOne(productId),
      ),
    );
    const productNameById = new Map(products.map((product) => [product.id, product.name]));

    const priceResults = await Promise.allSettled(
      items.map((item) =>
        this.branchProductPricesService.resolvePrice(
          item.productId,
          myBranch.priceTier,
          myBranch.parentBranchId,
        ),
      ),
    );

    const unpricedProductNames = items
      .map((item, index) => {
        const result = priceResults[index];
        if (result.status === "rejected") {
          const productName = productNameById.get(item.productId) ?? item.productId;
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          return `${productName} (${reason})`;
        }
        return null;
      })
      .filter((message): message is string => message !== null);

    if (unpricedProductNames.length > 0) {
      throw new BadRequestException(
        `Cannot create stock request — pricing failed: ${unpricedProductNames.join("; ")}`,
      );
    }

    return this.branchStockRequestsRepository.create({
      requesterBranchId: myBranch.id,
      fulfillerBranchId: myBranch.parentBranchId,
      requestedById: loggedInEmployeeId,
      notes: notes ?? null,
      items: items.map((item, index) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: (priceResults[index] as PromiseFulfilledResult<number>).value,
      })),
    });
  }

  /**
   * Approves a PENDING request. This is purely a status change — it does
   * NOT ship anything or move any stock. Once approved, the fulfiller ships
   * against it via shipBranchStockRequest below, whenever and however much
   * they're ready to send.
   */
  async approveBranchStockRequest(
    requestId: string,
    req: RequestWithUser,
  ): Promise<BranchStockRequestDetail> {
    const { id: loggedInUserId } = req.user;
    const request = await this.checkExistence(requestId);

    if (request.status !== BranchStockRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot approve a request that is ${request.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    this.assertNotSelfApproval(request.requestedById, loggedInEmployeeId);
    await this.assertCanFulfil(request.fulfillerBranchId, loggedInEmployeeId, loggedInUserId);

    return this.branchStockRequestsRepository.approve(requestId, loggedInEmployeeId);
  }

  /**
   * Ships (creates AND dispatches, in one call) a transfer against an
   * already-APPROVED request — any number of items, any quantity up to
   * what's still outstanding. Covers the full amount in one call (the
   * common case) or less, repeatable as many times as needed (installment
   * delivery, or making up a previous shipment's shortfall). Same
   * authorization as approve/reject: not the requester, and only the
   * fulfiller (or the factory-approve permission, for a Factory-bound
   * request). The repository validates quantities against what's still
   * outstanding and decrements the source's stock in the same transaction.
   */
  async shipBranchStockRequest(
    requestId: string,
    createBranchStockRequestTransferDto: CreateBranchStockRequestTransferDto,
    req: RequestWithUser,
  ): Promise<BranchStockTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const { items } = createBranchStockRequestTransferDto;
    const request = await this.checkExistence(requestId);

    if (request.status !== BranchStockRequestStatus.APPROVED) {
      throw new BadRequestException(`Cannot ship against a request that is ${request.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    this.assertNotSelfApproval(request.requestedById, loggedInEmployeeId);
    await this.assertCanFulfil(request.fulfillerBranchId, loggedInEmployeeId, loggedInUserId);

    return this.branchStockRequestsRepository.shipRequestItems(
      requestId,
      items,
      loggedInEmployeeId,
    );
  }

  async rejectBranchStockRequest(
    requestId: string,
    req: RequestWithUser,
  ): Promise<BranchStockRequestDetail> {
    const { id: loggedInUserId } = req.user;
    const request = await this.checkExistence(requestId);

    if (request.status !== BranchStockRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a request that is ${request.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    this.assertNotSelfApproval(request.requestedById, loggedInEmployeeId);
    await this.assertCanFulfil(request.fulfillerBranchId, loggedInEmployeeId, loggedInUserId);

    return this.branchStockRequestsRepository.reject(requestId, loggedInEmployeeId);
  }

  async checkExistence(requestId: string): Promise<BranchStockRequestDetail> {
    const request = await this.branchStockRequestsRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Branch stock request not found");
    }

    return request;
  }

  /**
   * The requester and fulfiller must be different people — otherwise a
   * single role holding both the create and approve permissions (e.g.
   * branch-stock-operations.manage) could rubber-stamp its own request,
   * which defeats the point of an approval step. This matters most for
   * Factory-fulfilled requests (fulfillerBranchId null), where
   * assertCanFulfil below has no branch to check ownership against.
   */
  private assertNotSelfApproval(requestedById: string, loggedInEmployeeId: string): void {
    if (requestedById === loggedInEmployeeId) {
      throw new ForbiddenException("You cannot approve or reject your own request");
    }
  }

  /**
   * fulfillerBranchId null means the Factory — there's no Branch row to
   * check ownership against, so instead of an ownership check it requires
   * its own dedicated permission (branch-stock-request.approve-factory).
   * Holding the general branch.approve permission (or
   * branch-stock-operations.manage) is NOT enough on its own — same split
   * as branch-product-price.manage vs .manage-factory. Otherwise, only the
   * fulfiller branch's own distributor can act on a branch-to-branch
   * request.
   */
  private async assertCanFulfil(
    fulfillerBranchId: string | null,
    loggedInEmployeeId: string,
    loggedInUserId: string,
  ): Promise<void> {
    if (fulfillerBranchId === null) {
      const canApproveFactoryRequests = await this.permissionsService.hasPermission(
        loggedInUserId,
        "branch-stock-request.approve-factory",
      );

      if (!canApproveFactoryRequests) {
        throw new ForbiddenException(
          "You need the branch-stock-request.approve-factory permission to act on a Factory-bound request",
        );
      }

      return;
    }

    const fulfillerBranch = await this.branchService.checkExistence(fulfillerBranchId);

    if (fulfillerBranch.distributorId !== loggedInEmployeeId) {
      throw new ForbiddenException("Only this branch's own distributor can act on this request");
    }
  }
}
