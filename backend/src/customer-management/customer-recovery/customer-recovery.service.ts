import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { CustomersService } from "../customers/customers.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { CustomerRecoveryRepository } from "./customer-recovery.repository";
import { CreateCustomerRecoveryDto } from "./dto/create-customer-recovery.dto";
import { CustomerRecoveryFiltersDto } from "./dto/customer-recovery-filters.dto";
import { CustomerRecoveryDetail } from "./utils/types";
import { RequestWithUser } from "../../common/interfaces";
import { GlPostingService } from "../../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../../financial/gl-posting/utils/enums";

@Injectable()
export class CustomerRecoveryService {
  constructor(
    private readonly customerRecoveryRepository: CustomerRecoveryRepository,
    private readonly customersService: CustomersService,
    private readonly employeeService: EmployeeService,
    private readonly glPostingService: GlPostingService,
  ) {}

  async listCustomerRecoveries(
    customerRecoveryFiltersDto: CustomerRecoveryFiltersDto,
  ): Promise<PaginatedResponse<CustomerRecoveryDetail>> {
    return this.customerRecoveryRepository.findAll(customerRecoveryFiltersDto);
  }

  async getCustomerRecovery(recoveryId: string): Promise<CustomerRecoveryDetail> {
    return this.checkExistence(recoveryId);
  }

  async createCustomerRecovery(
    createCustomerRecoveryDto: CreateCustomerRecoveryDto,
    req: RequestWithUser,
  ): Promise<CustomerRecoveryDetail> {
    const { id: loggedInUserId } = req.user;
    const { customerId, amount, paymentMode, notes } = createCustomerRecoveryDto;

    const salesPersonId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    await this.customersService.checkExistence(customerId);

    const recovery = await this.customerRecoveryRepository.create({
      customerId,
      salesPersonId,
      amount,
      paymentMode,
      notes: notes ?? null,
      createdById: loggedInUserId,
    });

    const collected = Number(amount);
    if (collected > 0) {
      await this.glPostingService.postBalancedEntry({
        sourceType: GlSourceType.CUSTOMER_RECOVERY,
        sourceId: recovery.id,
        postingKind: GlPostingKind.COLLECT_AR,
        entryDate: new Date(),
        description: `Customer recovery ${recovery.id}`,
        createdById: loggedInUserId,
        lines: [
          { accountKey: "CASH", debit: collected, credit: 0, description: "Cash collected" },
          { accountKey: "AR", debit: 0, credit: collected, description: "AR settlement" },
        ],
      });
    }

    return recovery;
  }

  async checkExistence(recoveryId: string): Promise<CustomerRecoveryDetail> {
    const recovery = await this.customerRecoveryRepository.findById(recoveryId);

    if (!recovery) {
      throw new NotFoundException("Customer recovery not found");
    }

    return recovery;
  }
}
