import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { CustomersService } from "../customers/customers.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { ProductsService } from "../../product-management/products/products.service";
import { SalesPersonAssignmentsService } from "../../sales-management/sales-person-assignments/sales-person-assignments.service";
import { BranchProductPricesService } from "../../sales-management/branch-product-prices/branch-product-prices.service";
import { CustomerOrdersRepository } from "./customer-orders.repository";
import { CreateCustomerOrderDto } from "./dto/create-customer-order.dto";
import { CustomerOrderFiltersDto } from "./dto/customer-order-filters.dto";
import { CustomerOrderDetail, CustomerOrderListItem } from "./utils/types";
import { RequestWithUser } from "src/common/interfaces";

@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly customerOrdersRepository: CustomerOrdersRepository,
    private readonly customersService: CustomersService,
    private readonly employeeService: EmployeeService,
    private readonly productsService: ProductsService,
    private readonly salesPersonAssignmentsService: SalesPersonAssignmentsService,
    private readonly branchProductPricesService: BranchProductPricesService,
  ) {}

  async listCustomerOrders(
    customerOrderFiltersDto: CustomerOrderFiltersDto,
  ): Promise<PaginatedResponse<CustomerOrderListItem>> {
    return this.customerOrdersRepository.findAll(customerOrderFiltersDto);
  }

  async getCustomerOrder(orderId: string): Promise<CustomerOrderDetail> {
    return this.checkExistence(orderId);
  }

  async createCustomerOrder(
    createCustomerOrderDto: CreateCustomerOrderDto,
    req: RequestWithUser,
  ): Promise<CustomerOrderDetail> {
    const { id: loggedInUserId } = req.user;
    const { customerId, items, notes } = createCustomerOrderDto;

    const salesPersonId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);
    const salesPersonAssignment =
      await this.salesPersonAssignmentsService.checkExistence(salesPersonId);

    const [customer] = await Promise.all([
      this.customersService.checkExistence(customerId),
      Promise.all(
        [...new Set(items.map((item) => item.productId))].map((productId) =>
          this.productsService.findOne(productId),
        ),
      ),
    ]);

    // Same price resolution as branch-to-branch stock — in FIXED_PRICE mode
    // the shop's own price tier always wins and item.unitPrice is ignored;
    // in FREE_PRICE mode the Sales Person's typed price wins, or their
    // branch's standard price list if they didn't type one.
    const itemsWithTotals = await Promise.all(
      items.map(async (item) => {
        const unitPrice = await this.branchProductPricesService.resolvePrice(
          item.productId,
          customer.priceTier,
          salesPersonAssignment.branchId,
          item.unitPrice,
        );

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalAmount: item.quantity * unitPrice,
        };
      }),
    );

    const totalAmount = itemsWithTotals.reduce((sum, item) => sum + item.totalAmount, 0);

    await this.customersService.assertCreditLimitNotExceeded(customer, totalAmount);

    return this.customerOrdersRepository.create({
      customerId,
      salesPersonId,
      totalAmount,
      notes: notes ?? null,
      createdById: loggedInUserId,
      items: itemsWithTotals,
    });
  }

  async checkExistence(orderId: string): Promise<CustomerOrderDetail> {
    const order = await this.customerOrdersRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException("Customer order not found");
    }

    return order;
  }
}
