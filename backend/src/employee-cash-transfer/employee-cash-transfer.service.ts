import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EmployeeCashTransferStatus } from "@prisma/tenant-client";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { EmployeeService } from "../hr/employee/employee.service";
import { BranchService } from "../sales-management/branch/branch.service";
import { BranchStockTransfersService } from "../sales-management/branch-stock-transfers/branch-stock-transfers.service";
import { EmployeeCashTransferRepository } from "./employee-cash-transfer.repository";
import { CreateEmployeeCashTransferDto } from "./dto/create-employee-cash-transfer.dto";
import { UpdateEmployeeCashTransferDto } from "./dto/update-employee-cash-transfer.dto";
import { RespondToEmployeeCashTransferDto } from "./dto/respond-to-employee-cash-transfer.dto";
import { EmployeeCashTransferFiltersDto } from "./dto/employee-cash-transfer-filters.dto";
import { EmployeeCashTransferDetail } from "./utils/types";
import { RequestWithUser } from "../common/interfaces";

@Injectable()
export class EmployeeCashTransferService {
  constructor(
    private readonly employeeCashTransferRepository: EmployeeCashTransferRepository,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly branchStockTransfersService: BranchStockTransfersService,
  ) {}

  async listEmployeeCashTransfers(
    employeeCashTransferFiltersDto: EmployeeCashTransferFiltersDto,
  ): Promise<PaginatedResponse<EmployeeCashTransferDetail>> {
    return this.employeeCashTransferRepository.findAll(employeeCashTransferFiltersDto);
  }

  async getEmployeeCashTransfer(transferId: string): Promise<EmployeeCashTransferDetail> {
    return this.checkExistence(transferId);
  }

  async createEmployeeCashTransfer(
    createEmployeeCashTransferDto: CreateEmployeeCashTransferDto,
    req: RequestWithUser,
  ): Promise<EmployeeCashTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const { toEmployeeId, amount, notes, settlesTransferId } = createEmployeeCashTransferDto;

    const fromEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    if (fromEmployeeId === toEmployeeId) {
      throw new BadRequestException("An employee cannot transfer cash to themselves");
    }

    await this.employeeService.checkExistence(toEmployeeId);

    if (settlesTransferId) {
      await this.assertSettlesTransferDebt(settlesTransferId, fromEmployeeId, toEmployeeId, amount);
    }

    return this.employeeCashTransferRepository.create({
      fromEmployeeId,
      toEmployeeId,
      amount,
      senderNotes: notes ?? null,
      createdById: loggedInUserId,
      settlesTransferId: settlesTransferId ?? null,
    });
  }

  /**
   * Only the receiving branch's own distributor may pay down a stock
   * transfer's debt (they're the one who owes it), and only straight to
   * whoever actually dispatched that transfer — mirrors the ownership rules
   * already enforced on the transfer itself (see
   * BranchStockTransfersService.assertOwnsBranch / confirmReceipt). The
   * amount can also never exceed what's still outstanding on that transfer —
   * this doubles as the guard against paying toward a transfer that hasn't
   * been received yet, since nothing is due until then.
   */
  private async assertSettlesTransferDebt(
    settlesTransferId: string,
    fromEmployeeId: string,
    toEmployeeId: string,
    amount: number,
  ): Promise<void> {
    const transfer = await this.branchStockTransfersService.checkExistence(settlesTransferId);
    const toBranch = await this.branchService.checkExistence(transfer.toBranchId);

    if (toBranch.distributorId !== fromEmployeeId) {
      throw new ForbiddenException(
        "Only the receiving branch's own distributor can pay for this transfer",
      );
    }

    if (transfer.dispatchedById !== toEmployeeId) {
      throw new ForbiddenException("This payment must go to whoever dispatched this transfer");
    }

    const amountDue = await this.branchStockTransfersService.getAmountDue(settlesTransferId);

    if (amount > amountDue) {
      throw new BadRequestException(
        `Amount exceeds this transfer's outstanding balance (due: ${amountDue})`,
      );
    }
  }

  // Only the sender can edit their own transfer, and only while it's still
  // PENDING — once the receiver has responded, the record is locked.
  async updateEmployeeCashTransfer(
    transferId: string,
    updateEmployeeCashTransferDto: UpdateEmployeeCashTransferDto,
    req: RequestWithUser,
  ): Promise<EmployeeCashTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const { amount, notes } = updateEmployeeCashTransferDto;

    const transfer = await this.checkExistence(transferId);
    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    if (transfer.fromEmployeeId !== loggedInEmployeeId) {
      throw new ForbiddenException("Only the sender can update this transfer");
    }

    if (transfer.status !== EmployeeCashTransferStatus.PENDING) {
      throw new BadRequestException("Only a pending transfer can be updated");
    }

    return this.employeeCashTransferRepository.update(transferId, {
      ...(amount !== undefined && { amount }),
      ...(notes !== undefined && { senderNotes: notes }),
    });
  }

  // Only the receiver can respond, and only while it's still PENDING — a
  // transfer can be confirmed or rejected exactly once.
  async respondToEmployeeCashTransfer(
    transferId: string,
    respondToEmployeeCashTransferDto: RespondToEmployeeCashTransferDto,
    req: RequestWithUser,
  ): Promise<EmployeeCashTransferDetail> {
    const { id: loggedInUserId } = req.user;
    const { decision, notes } = respondToEmployeeCashTransferDto;

    const transfer = await this.checkExistence(transferId);
    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    if (transfer.toEmployeeId !== loggedInEmployeeId) {
      throw new ForbiddenException("Only the recipient can respond to this transfer");
    }

    if (transfer.status !== EmployeeCashTransferStatus.PENDING) {
      throw new BadRequestException("This transfer has already been responded to");
    }

    return this.employeeCashTransferRepository.respond(transferId, decision, notes ?? null);
  }

  async checkExistence(transferId: string): Promise<EmployeeCashTransferDetail> {
    const transfer = await this.employeeCashTransferRepository.findById(transferId);

    if (!transfer) {
      throw new NotFoundException("Employee cash transfer not found");
    }

    return transfer;
  }
}
