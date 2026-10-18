import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { EmployeeService } from "../../hr/employee/employee.service";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { BranchService } from "../branch/branch.service";
import { BranchStockTransfersService } from "../branch-stock-transfers/branch-stock-transfers.service";
import { BranchStockReturnsRepository } from "./branch-stock-returns.repository";
import { CreateBranchStockReturnDto } from "./dto/create-branch-stock-return.dto";
import { BranchStockReturnFiltersDto } from "./dto/branch-stock-return-filters.dto";
import { BranchStockReturnDetail, BranchStockReturnListItem } from "./utils/types";
import { BranchStockReturnStatus } from "./utils/enums";
import { BranchStockTransferStatus } from "../branch-stock-transfers/utils/enums";

@Injectable()
export class BranchStockReturnsService {
  constructor(
    private readonly branchStockReturnsRepository: BranchStockReturnsRepository,
    private readonly branchStockTransfersService: BranchStockTransfersService,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async listBranchStockReturns(
    branchStockReturnFiltersDto: BranchStockReturnFiltersDto,
  ): Promise<PaginatedResponse<BranchStockReturnListItem>> {
    return this.branchStockReturnsRepository.findAll(branchStockReturnFiltersDto);
  }

  async getBranchStockReturn(returnId: string): Promise<BranchStockReturnDetail> {
    return this.checkExistence(returnId);
  }

  /**
   * Only against a RECEIVED transfer — returningBranchId and
   * receivingBranchId are both resolved from that transfer server-side
   * (toBranchId / fromBranchId), never taken from the request body, so a
   * return can never be spoofed against a transfer the caller's branch
   * didn't receive.
   */
  async createBranchStockReturn(
    createBranchStockReturnDto: CreateBranchStockReturnDto,
    req: RequestWithUser,
  ): Promise<BranchStockReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const { transferId, items, reason } = createBranchStockReturnDto;

    const transfer = await this.branchStockTransfersService.checkExistence(transferId);

    if (transfer.status !== BranchStockTransferStatus.RECEIVED) {
      throw new BadRequestException(`Cannot return against a transfer that is ${transfer.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    await this.assertOwnsBranch(transfer.toBranch.id, loggedInEmployeeId, loggedInUserId);

    return this.branchStockReturnsRepository.create({
      transferId,
      returningBranchId: transfer.toBranch.id,
      receivingBranchId: transfer.fromBranch?.id ?? null,
      requestedById: loggedInEmployeeId,
      reason,
      items,
    });
  }

  async approveBranchStockReturn(
    returnId: string,
    req: RequestWithUser,
  ): Promise<BranchStockReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const stockReturn = await this.checkExistence(returnId);

    if (stockReturn.status !== BranchStockReturnStatus.PENDING) {
      throw new BadRequestException(`Cannot approve a return that is ${stockReturn.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    this.assertNotSelfApproval(stockReturn.requestedBy.id, loggedInEmployeeId);
    await this.assertCanApprove(
      stockReturn.receivingBranch?.id ?? null,
      loggedInEmployeeId,
      loggedInUserId,
    );

    return this.branchStockReturnsRepository.approve(returnId, loggedInEmployeeId);
  }

  async rejectBranchStockReturn(
    returnId: string,
    req: RequestWithUser,
  ): Promise<BranchStockReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const stockReturn = await this.checkExistence(returnId);

    if (stockReturn.status !== BranchStockReturnStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a return that is ${stockReturn.status}`);
    }

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    this.assertNotSelfApproval(stockReturn.requestedBy.id, loggedInEmployeeId);
    await this.assertCanApprove(
      stockReturn.receivingBranch?.id ?? null,
      loggedInEmployeeId,
      loggedInUserId,
    );

    return this.branchStockReturnsRepository.reject(returnId, loggedInEmployeeId);
  }

  async checkExistence(returnId: string): Promise<BranchStockReturnDetail> {
    const stockReturn = await this.branchStockReturnsRepository.findById(returnId);

    if (!stockReturn) {
      throw new NotFoundException("Branch stock return not found");
    }

    return stockReturn;
  }

  /**
   * Only the transfer's own receiving branch (its distributor) — or
   * branch-stock-operations.manage — can start a return against it.
   */
  private async assertOwnsBranch(
    branchId: string,
    loggedInEmployeeId: string,
    loggedInUserId: string,
  ): Promise<void> {
    const branch = await this.branchService.checkExistence(branchId);
    if (branch.distributorId === loggedInEmployeeId) return;

    const canManage = await this.permissionsService.hasPermission(
      loggedInUserId,
      "branch-stock-operations.manage",
    );

    if (!canManage) {
      throw new ForbiddenException("Only this branch's own distributor can create a return for it");
    }
  }

  /**
   * The requester and approver must be different people, same reasoning as
   * BranchStockRequestsService.assertNotSelfApproval — matters most for
   * Factory-bound returns (receivingBranchId null), where assertCanApprove
   * below has no branch to check ownership against.
   */
  private assertNotSelfApproval(requestedById: string, loggedInEmployeeId: string): void {
    if (requestedById === loggedInEmployeeId) {
      throw new ForbiddenException("You cannot approve or reject your own return");
    }
  }

  /**
   * receivingBranchId null means the Factory — there's no Branch row to
   * check ownership against, so it requires its own dedicated permission
   * (branch-stock-return.approve-factory), same split as
   * branch-stock-request.approve vs .approve-factory. Otherwise, only the
   * receiving branch's own distributor can act on the return.
   */
  private async assertCanApprove(
    receivingBranchId: string | null,
    loggedInEmployeeId: string,
    loggedInUserId: string,
  ): Promise<void> {
    if (receivingBranchId === null) {
      const canApproveFactoryReturns = await this.permissionsService.hasPermission(
        loggedInUserId,
        "branch-stock-return.approve-factory",
      );

      if (!canApproveFactoryReturns) {
        throw new ForbiddenException(
          "You need the branch-stock-return.approve-factory permission to act on a Factory-bound return",
        );
      }

      return;
    }

    const receivingBranch = await this.branchService.checkExistence(receivingBranchId);

    if (receivingBranch.distributorId !== loggedInEmployeeId) {
      throw new ForbiddenException("Only the receiving branch's own distributor can act on this return");
    }
  }
}
