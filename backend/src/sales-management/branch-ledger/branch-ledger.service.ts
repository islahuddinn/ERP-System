import { ForbiddenException, Injectable } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { EmployeeService } from "../../hr/employee/employee.service";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { BranchService } from "../branch/branch.service";
import { BranchLedgerRepository } from "./branch-ledger.repository";
import { BranchLedgerFiltersDto } from "./dto/branch-ledger-filters.dto";
import { BranchLedgerEntryDetail } from "./utils/types";
import { BranchLedgerSummary, EmployeeDebtsSummary } from "./utils/interfaces";

@Injectable()
export class BranchLedgerService {
  constructor(
    private readonly branchLedgerRepository: BranchLedgerRepository,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async listMyBranchLedger(
    branchLedgerFiltersDto: BranchLedgerFiltersDto,
    req: RequestWithUser,
  ): Promise<PaginatedResponse<BranchLedgerEntryDetail>> {
    if (await this.canViewAllBranches(req)) {
      return this.branchLedgerRepository.findAllForAllBranches(branchLedgerFiltersDto);
    }
    const myBranch = await this.getMyBranch(req);
    return this.branchLedgerRepository.findAll(myBranch.id, branchLedgerFiltersDto);
  }

  async getMyBranchLedgerSummary(req: RequestWithUser): Promise<BranchLedgerSummary> {
    if (await this.canViewAllBranches(req)) {
      return this.branchLedgerRepository.getGlobalSummary();
    }
    const myBranch = await this.getMyBranch(req);
    return this.branchLedgerRepository.getSummary(myBranch.id);
  }

  private async canViewAllBranches(req: RequestWithUser): Promise<boolean> {
    const { id: loggedInUserId } = req.user;
    return this.permissionsService.hasPermission(loggedInUserId, "branch-ledger.view-all");
  }

  async getMyDebts(req: RequestWithUser): Promise<EmployeeDebtsSummary> {
    const { id: loggedInUserId } = req.user;
    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    return this.branchLedgerRepository.findMyDebts(loggedInEmployeeId);
  }

  async getEmployeeDebts(employeeId: string, req: RequestWithUser): Promise<EmployeeDebtsSummary> {
    await this.employeeService.checkExistence(employeeId);
    await this.assertCanViewDebts(employeeId, req);
    return this.branchLedgerRepository.findMyDebts(employeeId);
  }

  /**
   * Plain "branch-ledger.view" only ever sees your own debts — employeeId
   * must match the caller. "branch-ledger.view-all" (finance/accounts/admin)
   * lifts that and allows any employeeId, same pattern as
   * EmployeeCashLedgerService.assertCanViewLedger.
   */
  private async assertCanViewDebts(employeeId: string, req: RequestWithUser): Promise<void> {
    const { id: loggedInUserId } = req.user;

    const canViewAll = await this.permissionsService.hasPermission(
      loggedInUserId,
      "branch-ledger.view-all",
    );
    if (canViewAll) return;

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    if (employeeId !== loggedInEmployeeId) {
      throw new ForbiddenException("You can only view your own stock-transfer debts");
    }
  }

  private async getMyBranch(req: RequestWithUser) {
    const { id: loggedInUserId } = req.user;
    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    return this.branchService.getBranchForDistributor(loggedInEmployeeId);
  }
}
