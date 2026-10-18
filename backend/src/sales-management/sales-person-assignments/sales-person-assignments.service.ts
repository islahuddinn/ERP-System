import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { RequestWithUser } from "../../common/interfaces";
import { EmployeeService } from "../../hr/employee/employee.service";
import { BranchService } from "../branch/branch.service";
import { SalesPersonAssignmentsRepository } from "./sales-person-assignments.repository";
import { AssignSalesPersonDto } from "./dto/assign-sales-person.dto";
import { SalesPersonAssignmentFiltersDto } from "./dto/sales-person-assignment-filters.dto";
import { SalesPersonAssignmentDetail } from "./utils/types";

@Injectable()
export class SalesPersonAssignmentsService {
  constructor(
    private readonly salesPersonAssignmentsRepository: SalesPersonAssignmentsRepository,
    private readonly employeeService: EmployeeService,
    private readonly branchService: BranchService,
  ) {}

  async listSalesPersonAssignments(
    salesPersonAssignmentFiltersDto: SalesPersonAssignmentFiltersDto,
  ): Promise<PaginatedResponse<SalesPersonAssignmentDetail>> {
    return this.salesPersonAssignmentsRepository.findAll(salesPersonAssignmentFiltersDto);
  }

  // The branch is always the caller's own — resolved from Branch.distributorId,
  // never taken from the request body.
  async assignSalesPerson(
    assignSalesPersonDto: AssignSalesPersonDto,
    req: RequestWithUser,
  ): Promise<SalesPersonAssignmentDetail> {
    const { id: loggedInUserId } = req.user;
    const { employeeId } = assignSalesPersonDto;

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const myBranch = await this.branchService.getBranchForDistributor(loggedInEmployeeId);
    await this.employeeService.checkExistence(employeeId);

    return this.salesPersonAssignmentsRepository.assign(employeeId, myBranch.id);
  }

  async unassignSalesPerson(employeeId: string, req: RequestWithUser): Promise<void> {
    const { id: loggedInUserId } = req.user;

    const loggedInEmployeeId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const myBranch = await this.branchService.getBranchForDistributor(loggedInEmployeeId);
    const assignment = await this.checkExistence(employeeId);

    if (assignment.branchId !== myBranch.id) {
      throw new NotFoundException("This Sales Person is not assigned to your branch");
    }

    await this.salesPersonAssignmentsRepository.unassign(employeeId);
  }

  async checkExistence(employeeId: string): Promise<SalesPersonAssignmentDetail> {
    const assignment = await this.salesPersonAssignmentsRepository.findByEmployeeId(employeeId);

    if (!assignment) {
      throw new NotFoundException("This employee is not assigned as a Sales Person to any branch");
    }

    return assignment;
  }
}
