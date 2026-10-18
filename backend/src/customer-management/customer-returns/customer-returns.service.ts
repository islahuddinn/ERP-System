import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { EmployeeService } from "../../hr/employee/employee.service";
import { CustomerDeliveriesService } from "../customer-deliveries/customer-deliveries.service";
import { SalesPersonAssignmentsService } from "../../sales-management/sales-person-assignments/sales-person-assignments.service";
import { CustomerReturnsRepository } from "./customer-returns.repository";
import { CreateCustomerReturnDto } from "./dto/create-customer-return.dto";
import { CustomerReturnFiltersDto } from "./dto/customer-return-filters.dto";
import { CustomerReturnDetail } from "./utils/types";
import { CustomerReturnStatus } from "./utils/enums";
import { RequestWithUser } from "../../common/interfaces";

@Injectable()
export class CustomerReturnsService {
  constructor(
    private readonly customerReturnsRepository: CustomerReturnsRepository,
    private readonly employeeService: EmployeeService,
    private readonly customerDeliveriesService: CustomerDeliveriesService,
    private readonly salesPersonAssignmentsService: SalesPersonAssignmentsService,
  ) {}

  async listCustomerReturns(
    customerReturnFiltersDto: CustomerReturnFiltersDto,
  ): Promise<PaginatedResponse<CustomerReturnDetail>> {
    return this.customerReturnsRepository.findAll(customerReturnFiltersDto);
  }

  async getCustomerReturn(returnId: string): Promise<CustomerReturnDetail> {
    return this.checkExistence(returnId);
  }

  /**
   * customerId, productId, and unitPrice are all derived from the delivery
   * item — never taken from the request body — so a return can never
   * diverge from what was actually delivered. Created PENDING: no ledger
   * entry and no stock change until it's approved.
   */
  async createCustomerReturn(
    createCustomerReturnDto: CreateCustomerReturnDto,
    req: RequestWithUser,
  ): Promise<CustomerReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const { deliveryItemId, quantity, reason, notes } = createCustomerReturnDto;

    const salesPersonId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const deliveryItem = await this.customerDeliveriesService.checkDeliveryItemExistence(
      deliveryItemId,
    );

    const unitPrice = Number(deliveryItem.unitPrice);
    const totalAmount = quantity * unitPrice;

    return this.customerReturnsRepository.create(
      {
        customerId: deliveryItem.delivery.customerId,
        salesPersonId,
        deliveryItemId,
        productId: deliveryItem.productId,
        quantity,
        unitPrice,
        totalAmount,
        reason,
        notes: notes ?? null,
        createdById: loggedInUserId,
      },
      deliveryItem.quantity,
    );
  }

  async approveCustomerReturn(
    returnId: string,
    req: RequestWithUser,
  ): Promise<CustomerReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const customerReturn = await this.checkExistence(returnId);

    if (customerReturn.status !== CustomerReturnStatus.PENDING) {
      throw new BadRequestException(`Cannot approve a return that is ${customerReturn.status}`);
    }

    const approvedById = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    // Stock goes back to the ORIGINAL delivery's Sales Person's branch —
    // not whoever happens to be approving — mirrors how
    // CustomerDeliveriesService.markAsDelivered resolves the decrement
    // branch.
    const salesPersonAssignment = await this.salesPersonAssignmentsService.checkExistence(
      customerReturn.deliveryItem.delivery.salesPersonId,
    );

    return this.customerReturnsRepository.approve(
      returnId,
      approvedById,
      salesPersonAssignment.branchId,
    );
  }

  async rejectCustomerReturn(
    returnId: string,
    req: RequestWithUser,
  ): Promise<CustomerReturnDetail> {
    const { id: loggedInUserId } = req.user;
    const customerReturn = await this.checkExistence(returnId);

    if (customerReturn.status !== CustomerReturnStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a return that is ${customerReturn.status}`);
    }

    const rejectedById = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    return this.customerReturnsRepository.reject(returnId, rejectedById);
  }

  async checkExistence(returnId: string): Promise<CustomerReturnDetail> {
    const customerReturn = await this.customerReturnsRepository.findById(returnId);

    if (!customerReturn) {
      throw new NotFoundException("Customer return not found");
    }

    return customerReturn;
  }
}
