import { Injectable } from "@nestjs/common";
import { BrokerStatus, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { BrokerFiltersDto } from "./dto/broker-filters.dto";
import {
  BROKER_DETAIL_SELECT,
  BROKER_LIST_SELECT,
  BROKER_SORTABLE_FIELDS,
} from "./utils/constants";
import { BrokerDetail, BrokerListItem } from "./utils/types";

@Injectable()
export class BrokerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(brokerFiltersDto: BrokerFiltersDto): Promise<PaginatedResponse<BrokerListItem>> {
    const { search, status, zoneId, sortBy, sortOrder, page = 1, limit = 10 } = brokerFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BrokerWhereInput = { deletedAt: null };

    if (search) {
      where.OR = buildSearchFilter(search, ["brokerCode", "name", "contactPerson", "phone", "email"]);
    }
    if (status) where.status = status;
    if (zoneId) where.zoneId = zoneId;

    const orderBy =
      sortBy && BROKER_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.broker.findMany({
        where,
        skip,
        take,
        orderBy,
        select: BROKER_LIST_SELECT,
      }),
      this.prisma.broker.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(brokerId: string): Promise<BrokerDetail | null> {
    return this.prisma.broker.findFirst({
      where: { id: brokerId, deletedAt: null },
      select: BROKER_DETAIL_SELECT,
    });
  }

  async generateBrokerCode(): Promise<string> {
    const latestBroker = await this.prisma.broker.findFirst({
      where: { brokerCode: { startsWith: "BR-" } },
      orderBy: { createdAt: "desc" },
      select: { brokerCode: true },
    });

    const latestNumber = latestBroker?.brokerCode
      ? Number.parseInt(latestBroker.brokerCode.replace("BR-", ""), 10)
      : 0;
    const nextNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;

    return `BR-${String(nextNumber).padStart(4, "0")}`;
  }

  async create(data: Prisma.BrokerCreateInput): Promise<BrokerDetail> {
    return this.prisma.broker.create({
      data,
      select: BROKER_DETAIL_SELECT,
    });
  }

  async update(brokerId: string, data: Prisma.BrokerUpdateInput): Promise<BrokerDetail> {
    return this.prisma.broker.update({
      where: { id: brokerId },
      data,
      select: BROKER_DETAIL_SELECT,
    });
  }

  async softDelete(brokerId: string): Promise<void> {
    await this.prisma.broker.update({
      where: { id: brokerId },
      data: { deletedAt: new Date(), isActive: false, status: BrokerStatus.INACTIVE },
    });
  }
}
