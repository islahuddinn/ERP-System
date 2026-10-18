import { Injectable } from "@nestjs/common";
import { Prisma, TransporterStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { TransporterFiltersDto } from "./dto/transporter-filters.dto";
import { TransporterDetail, TransporterListItem } from "./utils/types";

const TRANSPORTER_SORTABLE_FIELDS = [
  "code",
  "name",
  "contactName",
  "phone",
  "status",
  "createdAt",
  "updatedAt",
];

const TRANSPORTER_LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  contactName: true,
  phone: true,
  email: true,
  vehicleRegistration: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TransporterSelect;

const TRANSPORTER_DETAIL_SELECT = {
  ...TRANSPORTER_LIST_SELECT,
  address: true,
  notes: true,
} satisfies Prisma.TransporterSelect;

@Injectable()
export class TransporterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    transporterFiltersDto: TransporterFiltersDto,
  ): Promise<PaginatedResponse<TransporterListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = transporterFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.TransporterWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, [
        "code",
        "name",
        "contactName",
        "phone",
        "email",
        "vehicleRegistration",
      ]);
    }
    if (status) where.status = status;

    const orderBy =
      sortBy && TRANSPORTER_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.transporter.findMany({
        where,
        skip,
        take,
        orderBy,
        select: TRANSPORTER_LIST_SELECT,
      }),
      this.prisma.transporter.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; code: string; name: string; phone: string | null }[]> {
    return this.prisma.transporter.findMany({
      where: { status: TransporterStatus.ACTIVE },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(transporterId: string): Promise<TransporterDetail | null> {
    return this.prisma.transporter.findUnique({
      where: { id: transporterId },
      select: TRANSPORTER_DETAIL_SELECT,
    });
  }

  async create(data: Prisma.TransporterCreateInput): Promise<TransporterDetail> {
    return this.prisma.transporter.create({
      data,
      select: TRANSPORTER_DETAIL_SELECT,
    });
  }

  async update(
    transporterId: string,
    data: Prisma.TransporterUpdateInput,
  ): Promise<TransporterDetail> {
    return this.prisma.transporter.update({
      where: { id: transporterId },
      data,
      select: TRANSPORTER_DETAIL_SELECT,
    });
  }

  async delete(transporterId: string): Promise<void> {
    await this.prisma.transporter.delete({ where: { id: transporterId } });
  }
}
