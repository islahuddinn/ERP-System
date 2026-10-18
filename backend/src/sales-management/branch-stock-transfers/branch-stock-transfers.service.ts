import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { EmployeeService } from "../../hr/employee/employee.service";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { BranchService } from "../branch/branch.service";
import { BranchStockTransfersRepository, ConfirmReceiptItemData } from "./branch-stock-transfers.repository";
import { BranchStockTransferFiltersDto } from "./dto/branch-stock-transfer-filters.dto";
import { ConfirmBranchStockTransferReceiptDto } from "./dto/confirm-branch-stock-transfer-receipt.dto";
import {
  BranchStockTransferDetail,
  BranchStockTransferListItem,
  BranchStockTransferWithAmountDue,
} from "./utils/types";
import { BranchStockTransferStatus } from "./utils/enums";

@Injectable()
export class BranchStockTransfersService {
  constructor(
    private readonly branchStockTransfersRepository: BranchStockTransfersRepository,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async listBranchStockTransfers(
    branchStockTransferFiltersDto: BranchStockTransferFiltersDto,
  ): Promise<PaginatedResponse<BranchStockTransferListItem>> {
    return this.branchStockTransfersRepository.findAll(branchStockTransferFiltersDto);
  }

  async getBranchStockTransfer(transferId: string): Promise<BranchStockTransferWithAmountDue> {
    const [transfer, amountDue] = await Promise.all([
      this.checkExistence(transferId),
      this.branchStockTransfersRepository.getAmountDue(transferId),
    ]);

    return { ...transfer, amountDue };
  }

  async getAmountDue(transferId: string): Promise<number> {
    return this.branchStockTransfersRepository.getAmountDue(transferId);
  }

  /**
   * Stock lands in the destination branch's balance here — only that
   * branch's own distributor can confirm they've physically received it.
   * The caller states how much of each item actually arrived; it may be
   * less than what was shipped (damage/loss in transit), never more.
   * Every item must be accounted for — no silent "the rest was fully
   * received" for anything left out of the list.
   */
  async confirmBranchStockTransferReceipt(
    transferId: string,
    confirmBranchStockTransferReceiptDto: ConfirmBranchStockTransferReceiptDto,
    req: RequestWithUser,
  ): Promise<BranchStockTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const { items: receivedItems } = confirmBranchStockTransferReceiptDto;
    const transfer = await this.checkExistence(transferId);

    if (transfer.status !== BranchStockTransferStatus.DISPATCHED) {
      throw new BadRequestException(
        `Cannot confirm receipt of a transfer that is ${transfer.status}`,
      );
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    await this.assertOwnsBranch(transfer.toBranchId, loggedInEmployeeId);

    const itemsWithReceivedQuantity = this.resolveReceivedQuantities(transfer, receivedItems);

    return this.branchStockTransfersRepository.confirmReceipt(
      transferId,
      loggedInEmployeeId,
      itemsWithReceivedQuantity,
    );
  }

  /**
   * A transfer is only ever cancellable while DISPATCHED — it's created
   * already-shipped (see BranchStockRequestsRepository.shipRequestItems),
   * so there's no earlier, nothing-has-moved-yet state to cancel out of.
   * Cancelling here reverses a real inventory movement (stock already left
   * the source), so it always requires branch-stock-operations.manage —
   * never either branch's own distributor acting unilaterally. RECEIVED and
   * CANCELLED are terminal and rejected outright.
   */
  async cancelBranchStockTransfer(
    transferId: string,
    req: RequestWithUser,
  ): Promise<BranchStockTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const transfer = await this.checkExistence(transferId);

    if (transfer.status !== BranchStockTransferStatus.DISPATCHED) {
      throw new BadRequestException(`Cannot cancel a transfer that is ${transfer.status}`);
    }

    await this.assertCanManageOperations(loggedInUserId);

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    return this.branchStockTransfersRepository.cancel(transferId, loggedInEmployeeId);
  }

  /**
   * Cross-checks the caller's stated received quantities against the
   * transfer's actual shipped items: every item must be present exactly
   * once, unknown transferItemIds are rejected, and no item's received
   * quantity may exceed what was shipped for it. Runs entirely against
   * data already loaded on `transfer` — no extra query.
   */
  private resolveReceivedQuantities(
    transfer: BranchStockTransferDetail,
    receivedItems: ConfirmBranchStockTransferReceiptDto["items"],
  ): ConfirmReceiptItemData[] {
    const receivedQuantityByItemId = new Map(
      receivedItems.map((item) => [item.transferItemId, item.receivedQuantity]),
    );

    const unknownItemIds = [...receivedQuantityByItemId.keys()].filter(
      (transferItemId) => !transfer.items.some((item) => item.id === transferItemId),
    );
    if (unknownItemIds.length > 0) {
      throw new BadRequestException(
        `These items don't belong to this transfer: ${unknownItemIds.join(", ")}`,
      );
    }

    const missingItems = transfer.items.filter((item) => !receivedQuantityByItemId.has(item.id));
    if (missingItems.length > 0) {
      const missingProductNames = missingItems.map((item) => item.product.name);
      throw new BadRequestException(
        `Received quantity missing for: ${missingProductNames.join(", ")}`,
      );
    }

    const overReceivedItems = transfer.items.filter((item) => {
      const receivedQuantity = receivedQuantityByItemId.get(item.id) as number;
      return receivedQuantity > item.quantity;
    });
    if (overReceivedItems.length > 0) {
      const overReceivedProductNames = overReceivedItems.map((item) => item.product.name);
      throw new BadRequestException(
        `Received quantity cannot exceed the shipped quantity for: ${overReceivedProductNames.join(", ")}`,
      );
    }

    return transfer.items.map((item) => ({
      transferItemId: item.id,
      productId: item.productId,
      unitPrice: Number(item.unitPrice),
      receivedQuantity: receivedQuantityByItemId.get(item.id) as number,
    }));
  }

  async checkExistence(transferId: string): Promise<BranchStockTransferDetail> {
    const transfer = await this.branchStockTransfersRepository.findById(transferId);

    if (!transfer) {
      throw new NotFoundException("Branch stock transfer not found");
    }

    return transfer;
  }

  /**
   * branchId null means the Factory — no Branch row to check ownership
   * against, so anyone holding the permission may act on its behalf.
   */
  private async assertOwnsBranch(branchId: string | null, loggedInEmployeeId: string): Promise<void> {
    if (branchId === null) return;

    const branch = await this.branchService.checkExistence(branchId);

    if (branch.distributorId !== loggedInEmployeeId) {
      throw new ForbiddenException("Only this branch's own distributor can act on this transfer");
    }
  }

  private async assertCanManageOperations(loggedInUserId: string): Promise<void> {
    const canManageOperations = await this.permissionsService.hasPermission(
      loggedInUserId,
      "branch-stock-operations.manage",
    );

    if (!canManageOperations) {
      throw new ForbiddenException(
        "Cancelling a transfer requires the branch-stock-operations.manage permission",
      );
    }
  }
}
