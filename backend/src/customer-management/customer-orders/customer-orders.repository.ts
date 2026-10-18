import { Injectable } from "@nestjs/common";
import { CustomerDeliveryStatus, CustomerOrderStatus, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { CustomerOrderFiltersDto } from "./dto/customer-order-filters.dto";
import { CUSTOMER_ORDER_DETAIL_INCLUDE, CUSTOMER_ORDER_LIST_INCLUDE } from "./utils/constants";
import { CustomerOrderDetail, CustomerOrderListItem } from "./utils/types";

const CUSTOMER_ORDER_SORTABLE_FIELDS = ["orderDate", "createdAt", "totalAmount", "status"];

export interface CreateCustomerOrderItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface CreateCustomerOrderData {
  customerId: string;
  salesPersonId: string;
  totalAmount: number;
  notes: string | null;
  createdById: string;
  items: CreateCustomerOrderItemData[];
}

@Injectable()
export class CustomerOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerOrderFiltersDto: CustomerOrderFiltersDto,
  ): Promise<PaginatedResponse<CustomerOrderListItem>> {
    const {
      customerId,
      salesPersonId,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = customerOrderFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerOrderWhereInput = {
      ...(customerId && { customerId }),
      ...(salesPersonId && { salesPersonId }),
      ...(status && { status }),
    };

    const orderBy =
      sortBy && CUSTOMER_ORDER_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { orderDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CUSTOMER_ORDER_LIST_INCLUDE,
      }),
      this.prisma.customerOrder.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(orderId: string): Promise<CustomerOrderDetail | null> {
    return this.prisma.customerOrder.findUnique({
      where: { id: orderId },
      include: CUSTOMER_ORDER_DETAIL_INCLUDE,
    });
  }

  async generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.customerOrder.findFirst({
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const next = latest ? parseInt(latest.orderNumber.replace("ORD-", ""), 10) + 1 : 1;
    return `ORD-${String(next).padStart(6, "0")}`;
  }

  private async generateDeliveryNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.customerDelivery.findFirst({
      orderBy: { deliveryNumber: "desc" },
      select: { deliveryNumber: true },
    });

    const next = latest ? parseInt(latest.deliveryNumber.replace("DEL-", ""), 10) + 1 : 1;
    return `DEL-${String(next).padStart(6, "0")}`;
  }

  // Creates the order + items, then immediately creates its linked PENDING
  // delivery (same items copied over, orderItemId wired to each order item) in
  // the same transaction — the delivery moves no money/stock until it's later
  // marked DELIVERED (see CustomerDeliveriesRepository.markAsDelivered).
  async create(data: CreateCustomerOrderData): Promise<CustomerOrderDetail> {
    const { items, ...header } = data;

    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped advisory lock: serializes order-number generation
      // across concurrent create() calls (auto-released on commit/rollback),
      // so two requests can never read the same "latest" number and collide.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_order_number'))`;
      const orderNumber = await this.generateOrderNumber(tx);

      const order = await tx.customerOrder.create({
        data: {
          ...header,
          orderNumber,
          items: { create: items },
        },
        include: { items: true },
      });

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_delivery_number'))`;
      const deliveryNumber = await this.generateDeliveryNumber(tx);

      await tx.customerDelivery.create({
        data: {
          deliveryNumber,
          customerId: header.customerId,
          salesPersonId: header.salesPersonId,
          orderId: order.id,
          status: CustomerDeliveryStatus.PENDING,
          subtotal: order.totalAmount,
          discountAmount: 0,
          totalAmount: order.totalAmount,
          createdById: header.createdById,
          items: {
            create: order.items.map((orderItem) => ({
              productId: orderItem.productId,
              orderItemId: orderItem.id,
              quantity: orderItem.quantity,
              unitPrice: orderItem.unitPrice,
              totalAmount: orderItem.totalAmount,
            })),
          },
        },
      });

      return tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: CUSTOMER_ORDER_DETAIL_INCLUDE,
      });
    });
  }

  // Recomputes an order's status from its items' delivered-vs-ordered quantities.
  // Only counts delivery items whose delivery has actually been marked
  // DELIVERED — the auto-created PENDING delivery must not count yet. Runs
  // inside the CustomerDelivery repository's own transaction (`tx`) so a
  // delivery and its order's updated status are always committed together.
  async recalculateFulfillment(orderId: string, tx: Prisma.TransactionClient): Promise<void> {
    const order = await tx.customerOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: {
          include: {
            deliveryItems: {
              where: { delivery: { status: CustomerDeliveryStatus.DELIVERED } },
              select: { quantity: true },
            },
          },
        },
      },
    });

    const deliveredQuantityByItem = order.items.map((item) =>
      item.deliveryItems.reduce((sum, deliveryItem) => sum + deliveryItem.quantity, 0),
    );

    const isFullyDelivered = order.items.every(
      (item, index) => deliveredQuantityByItem[index] >= item.quantity,
    );
    const isPartiallyDelivered = deliveredQuantityByItem.some((quantity) => quantity > 0);

    const status = isFullyDelivered
      ? CustomerOrderStatus.DELIVERED
      : isPartiallyDelivered
        ? CustomerOrderStatus.PARTIALLY_DELIVERED
        : CustomerOrderStatus.PENDING;

    await tx.customerOrder.update({ where: { id: orderId }, data: { status } });
  }
}
