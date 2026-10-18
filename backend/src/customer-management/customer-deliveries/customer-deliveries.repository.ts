import { ConflictException, Injectable } from "@nestjs/common";
import { CustomerDeliveryStatus, CustomerLedgerEntryType, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, getPaginationParams } from "../../common/utils/pagination.helper";
import { CustomerOrdersRepository } from "../customer-orders/customer-orders.repository";
import { BranchStockRepository } from "../../sales-management/branch-stock/branch-stock.repository";
import { CustomerDeliveryFiltersDto } from "./dto/customer-delivery-filters.dto";
import {
  CUSTOMER_DELIVERY_DETAIL_INCLUDE,
  CUSTOMER_DELIVERY_ITEM_DETAIL_INCLUDE,
  CUSTOMER_DELIVERY_LIST_INCLUDE,
} from "./utils/constants";
import {
  CustomerDeliveryDetail,
  CustomerDeliveryItemDetail,
  CustomerDeliveryListItem,
} from "./utils/types";

const CUSTOMER_DELIVERY_SORTABLE_FIELDS = ["deliveryDate", "createdAt", "totalAmount"];

export interface CreateCustomerDeliveryItemData {
  productId: string;
  orderItemId: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface CreateCustomerDeliveryData {
  customerId: string;
  salesPersonId: string;
  orderId: string | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  createdById: string;
  items: CreateCustomerDeliveryItemData[];
}

@Injectable()
export class CustomerDeliveriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerOrdersRepository: CustomerOrdersRepository,
    private readonly branchStockRepository: BranchStockRepository,
  ) {}

  async findAll(
    customerDeliveryFiltersDto: CustomerDeliveryFiltersDto,
  ): Promise<PaginatedResponse<CustomerDeliveryListItem>> {
    const {
      status,
      customerId,
      salesPersonId,
      productId,
      orderId,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = customerDeliveryFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerDeliveryWhereInput = {
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(salesPersonId && { salesPersonId }),
      ...(orderId && { orderId }),
      ...(productId && { items: { some: { productId } } }),
    };

    const orderBy =
      sortBy && CUSTOMER_DELIVERY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { deliveryDate: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerDelivery.findMany({
        where,
        skip,
        take,
        orderBy,
        include: CUSTOMER_DELIVERY_LIST_INCLUDE,
      }),
      this.prisma.customerDelivery.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(deliveryId: string): Promise<CustomerDeliveryDetail | null> {
    return this.prisma.customerDelivery.findUnique({
      where: { id: deliveryId },
      include: CUSTOMER_DELIVERY_DETAIL_INCLUDE,
    });
  }

  // Used by CustomerReturnsService to derive a return's product/price/shop
  // from the delivery item it's against.
  async findItemById(deliveryItemId: string): Promise<CustomerDeliveryItemDetail | null> {
    return this.prisma.customerDeliveryItem.findUnique({
      where: { id: deliveryItemId },
      include: CUSTOMER_DELIVERY_ITEM_DETAIL_INCLUDE,
    });
  }

  async generateDeliveryNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.customerDelivery.findFirst({
      orderBy: { deliveryNumber: "desc" },
      select: { deliveryNumber: true },
    });
    const next = latest ? parseInt(latest.deliveryNumber.replace("DEL-", ""), 10) + 1 : 1;
    return `DEL-${String(next).padStart(6, "0")}`;
  }

  // Creates the delivery + items only, status PENDING — no money or order
  // status changes yet. Those only happen once the delivery is confirmed via
  // markAsDelivered(). Wrapped in a transaction so the number-generation
  // advisory lock (see generateDeliveryNumber's caller below) and the create
  // are one atomic unit.
  async create(data: CreateCustomerDeliveryData): Promise<CustomerDeliveryDetail> {
    const { items, orderId, ...header } = data;

    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped advisory lock: serializes delivery-number
      // generation across concurrent create() calls (auto-released on
      // commit/rollback), so two requests can never collide on the same
      // "latest" number.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('customer_delivery_number'))`;
      const deliveryNumber = await this.generateDeliveryNumber(tx);

      const delivery = await tx.customerDelivery.create({
        data: {
          ...header,
          deliveryNumber,
          orderId,
          status: CustomerDeliveryStatus.PENDING,
          items: { create: items },
        },
      });

      return tx.customerDelivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: CUSTOMER_DELIVERY_DETAIL_INCLUDE,
      });
    });
  }

  // Confirms a PENDING delivery as DELIVERED — the only place the mirrored
  // debit entry on the shop's ledger and the order's recomputed fulfillment
  // status get written, all in one atomic transaction. `itemQuantityOverrides`
  // lets the confirmed quantity be less than what was pending (short on
  // stock) — price is never part of this, it was already locked in at
  // creation time and is never touched here.
  async markAsDelivered(
    deliveryId: string,
    deliveredById: string,
    salesPersonBranchId: string,
    itemQuantityOverrides?: { deliveryItemId: string; quantity: number }[],
  ): Promise<CustomerDeliveryDetail> {
    return this.prisma.$transaction(async (tx) => {
      // Atomically claim the delivery: the conditional update only affects a
      // row that is still PENDING, so if two confirmations race (double-click,
      // two staff), only one can win — the loser's count is 0 and it aborts
      // here, before any ledger entry or fulfillment recalculation happens.
      const claim = await tx.customerDelivery.updateMany({
        where: { id: deliveryId, status: CustomerDeliveryStatus.PENDING },
        data: {
          status: CustomerDeliveryStatus.DELIVERED,
          deliveredById,
          deliveredAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          "This delivery is no longer pending — it may have already been delivered",
        );
      }

      if (itemQuantityOverrides?.length) {
        for (const override of itemQuantityOverrides) {
          const item = await tx.customerDeliveryItem.findUniqueOrThrow({
            where: { id: override.deliveryItemId },
          });

          await tx.customerDeliveryItem.update({
            where: { id: override.deliveryItemId },
            data: {
              quantity: override.quantity,
              totalAmount: override.quantity * Number(item.unitPrice),
            },
          });
        }
      }

      const currentItems = await tx.customerDeliveryItem.findMany({ where: { deliveryId } });
      const subtotal = currentItems.reduce((sum, item) => sum + Number(item.totalAmount), 0);
      const currentDelivery = await tx.customerDelivery.findUniqueOrThrow({
        where: { id: deliveryId },
      });
      const totalAmount = subtotal - Number(currentDelivery.discountAmount);

      const delivery = await tx.customerDelivery.update({
        where: { id: deliveryId },
        data: { subtotal, totalAmount },
      });

      // Stock comes straight out of the Sales Person's own branch — a Sales
      // Person never carries their own stock, so there's nowhere else it
      // could come from. This runs before the ledger entry below so an
      // out-of-stock branch aborts the whole delivery, not just the goods.
      for (const item of currentItems) {
        await this.branchStockRepository.decrement(
          salesPersonBranchId,
          item.productId,
          item.quantity,
          tx,
        );
      }

      await tx.customerLedger.create({
        data: {
          customerId: delivery.customerId,
          date: delivery.deliveredAt as Date,
          type: CustomerLedgerEntryType.DELIVERY,
          reference: delivery.deliveryNumber,
          referenceId: delivery.id,
          description: `Delivery ${delivery.deliveryNumber}`,
          debit: Number(delivery.totalAmount),
          credit: 0,
          createdById: deliveredById,
        },
      });

      if (delivery.orderId) {
        await this.customerOrdersRepository.recalculateFulfillment(delivery.orderId, tx);
      }

      return tx.customerDelivery.findUniqueOrThrow({
        where: { id: deliveryId },
        include: CUSTOMER_DELIVERY_DETAIL_INCLUDE,
      });
    });
  }
}
