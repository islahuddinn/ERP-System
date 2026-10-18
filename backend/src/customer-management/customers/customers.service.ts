import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "./customers.repository";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomerFiltersDto } from "./dto/customer-filters.dto";
import { CustomerStatsDto } from "./dto/customer-stats.dto";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { CustomerCategoryService } from "../customer-categories/customer-category.service";
import { AreaService } from "../../sales-management/area/area.service";
import { CustomerDetail, CustomerListItem } from "./utils/types";
import { CustomerStatus } from "@prisma/tenant-client";

@Injectable()
export class CustomersService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerCategoryService: CustomerCategoryService,
    private readonly areaService: AreaService,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerDetail> {
    const {
      shopName,
      shopkeeperName,
      phone,
      email,
      cnic,
      customerType,
      categoryId,
      paymentMode,
      address,
      areaId,
      remarks,
      status,
      creditLimit,
      priceTier,
    } = createCustomerDto;

    await this.customerCategoryService.checkExistence(categoryId);
    await this.areaService.checkExistence(areaId);

    const code = await this.customerRepository.generateCustomerCode();

    try {
      return await this.customerRepository.create({
        code,
        shopName,
        shopkeeperName,
        phone,
        email,
        cnic,
        customerType,
        categoryId,
        paymentMode,
        address,
        areaId,
        remarks,
        creditLimit,
        ...(status && { status }),
        ...(priceTier && { priceTier }),
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A customer with this phone, email or CNIC already exists");
    }
  }

  async findAll(
    customerFiltersDto: CustomerFiltersDto,
  ): Promise<PaginatedResponse<CustomerListItem>> {
    return this.customerRepository.findAll(customerFiltersDto);
  }

  async findOne(customerId: string): Promise<CustomerDetail> {
    return this.checkExistence(customerId);
  }

  async dropdown() {
    return this.customerRepository.dropdown();
  }

  async update(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerDetail> {
    const existing = await this.checkExistence(customerId);

    // Capture current state BEFORE mutation so the audit interceptor can build a proper diff.
    // Strip the nested `sales` relation — only flat customer fields belong in the snapshot.
    const { sales: _sales, ...customerSnapshot } = existing;
    this.auditContext.setOldValue(customerSnapshot);
    this.auditContext.setEntityLabel(existing.shopName);

    const {
      shopName,
      shopkeeperName,
      phone,
      email,
      cnic,
      customerType,
      categoryId,
      paymentMode,
      address,
      areaId,
      remarks,
      status,
      creditLimit,
      priceTier,
    } = updateCustomerDto;

    if (categoryId) await this.customerCategoryService.checkExistence(categoryId);
    if (areaId) await this.areaService.checkExistence(areaId);

    try {
      return await this.customerRepository.update(customerId, {
        ...(shopName !== undefined && { shopName }),
        ...(shopkeeperName !== undefined && { shopkeeperName }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(cnic !== undefined && { cnic }),
        ...(customerType !== undefined && { customerType }),
        ...(categoryId !== undefined && { categoryId }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(address !== undefined && { address }),
        ...(areaId !== undefined && { areaId }),
        ...(remarks !== undefined && { remarks }),
        ...(status !== undefined && { status }),
        ...(creditLimit !== undefined && { creditLimit }),
        ...(priceTier !== undefined && { priceTier }),
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A customer with this phone, email or CNIC already exists");
    }
  }

  async softDelete(customerId: string): Promise<void> {
    const existing = await this.checkExistence(customerId);

    // Block deactivation when the customer is linked to transactional records (sales and the
    // payments / returns / dispatches that hang off them). This is the real reason a customer
    // can't be removed, so report it clearly instead of the misleading "outstanding balance".
    const linkedSalesCount = await this.customerRepository.countSales(customerId);
    if (linkedSalesCount > 0) {
      throw new BadRequestException(
        "Cannot delete this customer because it is linked to existing Sales, Payments, Returns, or Dispatch records. " +
          "Deactivate the customer instead, or remove the linked records first.",
      );
    }

    if (Number(existing.balance) !== 0) {
      throw new BadRequestException(
        `Cannot delete customer with outstanding balance of ${existing.balance}. Please settle all dues before deleting.`,
      );
    }

    // `existing.balance` only reflects the legacy sales/POS ledger — also check
    // the customer-orders/deliveries/returns/recovery ledger, which never
    // updates that column, so debt from the new distribution flow isn't missed.
    const distributionBalance =
      await this.customerRepository.getDistributionLedgerBalance(customerId);
    if (distributionBalance !== 0) {
      throw new BadRequestException(
        `Cannot delete customer with outstanding balance of ${distributionBalance} on the distribution ledger. Please settle all dues before deleting.`,
      );
    }

    const { sales: _sales, ...customerSnapshot } = existing;
    this.auditContext.setOldValue(customerSnapshot);
    this.auditContext.setEntityLabel(existing.shopName);

    await this.customerRepository.update(customerId, { status: CustomerStatus.INACTIVE });
  }

  async getStats(customerId: string): Promise<CustomerStatsDto> {
    await this.checkExistence(customerId);
    return this.customerRepository.getStats(customerId);
  }

  async getLedgerOverview(search?: string): Promise<any[]> {
    return this.customerRepository.getLedgerOverview(search);
  }

  // A null creditLimit means no limit has been set for this shop yet, so
  // every check is a no-op until someone explicitly sets one. When set, the
  // check is against the distribution ledger's running balance (not the
  // legacy `Customer.balance` column — see getDistributionLedgerBalance),
  // projected forward by the amount the caller is about to add.
  async assertCreditLimitNotExceeded(
    customer: CustomerDetail,
    additionalAmount: number,
  ): Promise<void> {
    if (customer.creditLimit == null) return;

    const currentBalance = await this.customerRepository.getDistributionLedgerBalance(customer.id);
    const projectedBalance = currentBalance + additionalAmount;

    if (projectedBalance > customer.creditLimit) {
      throw new BadRequestException(
        `This order would take ${customer.shopName}'s outstanding balance to ${projectedBalance.toFixed(2)}, over its credit limit of ${customer.creditLimit}`,
      );
    }
  }

  async checkExistence(customerId: string): Promise<CustomerDetail> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }
}
