import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerDeliveryStatus, CustomerOrderStatus } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { CustomersService } from "../customers/customers.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { ProductsService } from "../../product-management/products/products.service";
import { CustomerOrdersService } from "../customer-orders/customer-orders.service";
import { CustomerOrderDetail } from "../customer-orders/utils/types";
import { SalesPersonAssignmentsService } from "../../sales-management/sales-person-assignments/sales-person-assignments.service";
import { CustomerDeliveriesRepository } from "./customer-deliveries.repository";
import { CreateCustomerDeliveryDto } from "./dto/create-customer-delivery.dto";
import { CustomerDeliveryItemDto } from "./dto/customer-delivery-item.dto";
import { CustomerDeliveryFiltersDto } from "./dto/customer-delivery-filters.dto";
import {
  CustomerDeliveryDetail,
  CustomerDeliveryItemDetail,
  CustomerDeliveryListItem,
} from "./utils/types";
import { RequestWithUser } from "../../common/interfaces";
import { MarkCustomerDeliveryDeliveredItemDto } from "./dto/mark-customer-delivery-delivered.dto";

@Injectable()
export class CustomerDeliveriesService {
  constructor(
    private readonly customerDeliveriesRepository: CustomerDeliveriesRepository,
    private readonly customersService: CustomersService,
    private readonly employeeService: EmployeeService,
    private readonly productsService: ProductsService,
    private readonly customerOrdersService: CustomerOrdersService,
    private readonly salesPersonAssignmentsService: SalesPersonAssignmentsService,
  ) {}

  async listCustomerDeliveries(
    customerDeliveryFiltersDto: CustomerDeliveryFiltersDto,
  ): Promise<PaginatedResponse<CustomerDeliveryListItem>> {
    return this.customerDeliveriesRepository.findAll(customerDeliveryFiltersDto);
  }

  async getCustomerDelivery(deliveryId: string): Promise<CustomerDeliveryDetail> {
    return this.checkExistence(deliveryId);
  }

  async createCustomerDelivery(
    createCustomerDeliveryDto: CreateCustomerDeliveryDto,
    req: RequestWithUser,
  ): Promise<CustomerDeliveryDetail> {
    const { id: loggedInUserId } = req.user;
    const { customerId, orderId, items, discountAmount = 0, notes } = createCustomerDeliveryDto;

    const salesPersonId = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    await Promise.all([
      this.customersService.checkExistence(customerId),
      ...[...new Set(items.map((item) => item.productId))].map((productId) =>
        this.productsService.findOne(productId),
      ),
    ]);

    const orderItemById = orderId
      ? await this.validateOrderItemsForDelivery(orderId, customerId, items)
      : null;

    const itemsWithTotals = items.map((item) => {
      // The order's agreed price always wins when an item is linked to an
      // order — a delivery can never quietly change the price the shop and
      // sales person agreed on at booking time. Only items with no
      // orderItemId (no prior order to protect) accept a client-given price.
      const unitPrice = item.orderItemId
        ? Number(orderItemById!.get(item.orderItemId)!.unitPrice)
        : item.unitPrice;

      if (unitPrice === undefined) {
        throw new BadRequestException(
          "unitPrice is required for delivery items that are not linked to an order item",
        );
      }

      return {
        productId: item.productId,
        orderItemId: item.orderItemId ?? null,
        quantity: item.quantity,
        unitPrice,
        totalAmount: item.quantity * unitPrice,
      };
    });

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalAmount, 0);

    if (discountAmount > subtotal) {
      throw new BadRequestException("Discount amount cannot exceed the delivery's subtotal");
    }

    return this.customerDeliveriesRepository.create({
      customerId,
      salesPersonId,
      orderId: orderId ?? null,
      subtotal,
      discountAmount,
      totalAmount: subtotal - discountAmount,
      notes: notes ?? null,
      createdById: loggedInUserId,
      items: itemsWithTotals,
    });
  }

  async markAsDelivered(
    deliveryId: string,
    req: RequestWithUser,
    itemQuantityOverrides?: MarkCustomerDeliveryDeliveredItemDto[],
  ): Promise<CustomerDeliveryDetail> {
    const { id: loggedInUserId } = req.user;
    const delivery = await this.checkExistence(deliveryId);

    if (delivery.status !== CustomerDeliveryStatus.PENDING) {
      throw new BadRequestException(
        `Cannot mark a delivery that is ${delivery.status} as delivered`,
      );
    }

    const deliveredById = await this.employeeService.getEmployeeIdForUser(loggedInUserId);

    // Every Sales Person must be assigned to a branch before they can
    // deliver anything — there is no other source their stock could come
    // from, so this fails clearly here rather than silently short-shipping.
    const salesPersonAssignment = await this.salesPersonAssignmentsService.checkExistence(
      delivery.salesPersonId,
    );

    if (itemQuantityOverrides?.length) {
      this.assertQuantityOverridesAreValid(delivery, itemQuantityOverrides);
    }

    return this.customerDeliveriesRepository.markAsDelivered(
      deliveryId,
      deliveredById,
      salesPersonAssignment.branchId,
      itemQuantityOverrides,
    );
  }

  // Delivered quantity may only go DOWN from what's pending (short on stock)
  // — never up, and never for an item that isn't on this delivery. Price is
  // never part of this check; it was locked in when the delivery was created
  // and can't be touched here.
  private assertQuantityOverridesAreValid(
    delivery: CustomerDeliveryDetail,
    itemQuantityOverrides: { deliveryItemId: string; quantity: number }[],
  ): void {
    const deliveryItemById = new Map(delivery.items.map((item) => [item.id, item]));

    for (const override of itemQuantityOverrides) {
      const item = deliveryItemById.get(override.deliveryItemId);

      if (!item) {
        throw new BadRequestException("One of the items does not belong to this delivery");
      }

      if (override.quantity > item.quantity) {
        throw new BadRequestException(
          `Delivered quantity cannot exceed the pending quantity (${item.quantity}) for this item`,
        );
      }
    }

    const finalQuantityByItemId = new Map(
      delivery.items.map((item) => [
        item.id,
        itemQuantityOverrides.find((override) => override.deliveryItemId === item.id)?.quantity ??
          item.quantity,
      ]),
    );

    const projectedSubtotal = delivery.items.reduce(
      (sum, item) => sum + finalQuantityByItemId.get(item.id)! * Number(item.unitPrice),
      0,
    );

    if (Number(delivery.discountAmount) > projectedSubtotal) {
      throw new BadRequestException("Discount amount would exceed the adjusted delivery subtotal");
    }
  }

  async checkExistence(deliveryId: string): Promise<CustomerDeliveryDetail> {
    const delivery = await this.customerDeliveriesRepository.findById(deliveryId);

    if (!delivery) {
      throw new NotFoundException("Customer delivery not found");
    }

    return delivery;
  }

  // Used by CustomerReturnsService — a return is always created against a
  // specific delivery item, never a bare productId/unitPrice from the client.
  async checkDeliveryItemExistence(deliveryItemId: string): Promise<CustomerDeliveryItemDetail> {
    const deliveryItem = await this.customerDeliveriesRepository.findItemById(deliveryItemId);

    if (!deliveryItem) {
      throw new NotFoundException("Customer delivery item not found");
    }

    return deliveryItem;
  }

  // Validates the order can accept this delivery and returns a lookup of its
  // items — the caller uses this to resolve each delivery item's LOCKED price
  // (the order's price always wins, never a client-submitted one).
  private async validateOrderItemsForDelivery(
    orderId: string,
    customerId: string,
    items: CustomerDeliveryItemDto[],
  ): Promise<Map<string, CustomerOrderDetail["items"][number]>> {
    const order = await this.customerOrdersService.checkExistence(orderId);

    if (order.customerId !== customerId) {
      throw new BadRequestException("This order belongs to a different shop");
    }

    if (
      order.status === CustomerOrderStatus.DELIVERED ||
      order.status === CustomerOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot deliver against an order that is ${order.status}`);
    }

    const orderItemById = new Map(order.items.map((orderItem) => [orderItem.id, orderItem]));

    for (const item of items) {
      if (!item.orderItemId) continue;

      const orderItem = orderItemById.get(item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException(
          "One of the delivery items references an order item not on this order",
        );
      }

      if (orderItem.productId !== item.productId) {
        throw new BadRequestException(
          "A delivery item's product does not match its linked order item",
        );
      }

      // Quantity is free to go above what's left on the order (a shop can
      // always take extra on the spot) — only the price is locked. No
      // separate "unlinked extra item" layer: the same orderItemId just
      // carries whatever quantity is actually being delivered, at the
      // order's price.
    }

    return orderItemById;
  }
}
