import { ForbiddenException, Injectable } from "@nestjs/common";
import { RequestWithUser } from "../common/interfaces";
import { EmployeeService } from "../hr/employee/employee.service";
import { PermissionsService } from "../users/permissions/permissions.service";
import { EmployeeCashLedgerRepository } from "./employee-cash-ledger.repository";
import { EmployeeCashLedgerFiltersDto } from "./dto/employee-cash-ledger-filters.dto";
import { EmployeeCashLedgerResponse } from "./utils/types";

@Injectable()
export class EmployeeCashLedgerService {
  constructor(
    private readonly employeeCashLedgerRepository: EmployeeCashLedgerRepository,
    private readonly employeeService: EmployeeService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getEmployeeCashLedger(
    employeeId: string,
    employeeCashLedgerFiltersDto: EmployeeCashLedgerFiltersDto,
    req: RequestWithUser,
  ): Promise<EmployeeCashLedgerResponse> {
    await this.employeeService.checkExistence(employeeId);
    await this.assertCanViewLedger(employeeId, req);

    const [employee, summary, ledger] = await Promise.all([
      this.employeeCashLedgerRepository.findHeader(employeeId),
      this.employeeCashLedgerRepository.getSummary(employeeId, employeeCashLedgerFiltersDto),
      this.employeeCashLedgerRepository.findEntries(employeeId, employeeCashLedgerFiltersDto),
    ]);

    return { employee: employee!, summary, ledger };
  }

  /**
   * Plain "employee-cash-ledger.view" only ever sees your own ledger — every
   * counterparty on it is, by construction, someone you've actually
   * transacted with (see EmployeeCashLedgerRepository.findTransferIdsBetween),
   * so there's nothing further to restrict once employeeId matches you.
   * "employee-cash-ledger.view-all" (finance/accounts/admin) lifts that and
   * allows any employeeId.
   */
  private async assertCanViewLedger(employeeId: string, req: RequestWithUser): Promise<void> {
    const { id: loggedInUserId } = req.user;

    const canViewAll = await this.permissionsService.hasPermission(
      loggedInUserId,
      "employee-cash-ledger.view-all",
    );
    if (canViewAll) return;

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    if (employeeId !== loggedInEmployeeId) {
      throw new ForbiddenException("You can only view your own cash ledger");
    }
  }
}
