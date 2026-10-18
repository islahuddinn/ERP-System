import { Injectable } from "@nestjs/common";
import { Prisma, TerritoryStatus, BranchType } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { BranchFiltersDto } from "./dto/branch-filters.dto";
import { BranchDropdownFiltersDto } from "./dto/branch-dropdown-filters.dto";
import { BRANCH_DETAIL_INCLUDE, BRANCH_LIST_INCLUDE, BRANCH_TREE } from "./utils/constants";
import { BranchDetail, BranchListItem, BranchTree, ProductGroupSummary } from "./utils/types";

const BRANCH_SORTABLE_FIELDS = ["name", "code", "status", "createdAt", "updatedAt", "city.name"];

type RawBranchDetail = Prisma.BranchGetPayload<{ include: typeof BRANCH_DETAIL_INCLUDE }>;
type RawBranchListItem = Prisma.BranchGetPayload<{ include: typeof BRANCH_LIST_INCLUDE }>;

@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchFiltersDto: BranchFiltersDto): Promise<PaginatedResponse<BranchListItem>> {
    const { search, status, cityId, type, sortBy, sortOrder, page = 1, limit = 10 } =
      branchFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BranchWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name", "code"]);
    if (status) where.status = status;
    if (cityId) where.cityId = cityId;
    if (type === BranchType.PRIMARY) where.parentBranchId = null;
    if (type === BranchType.SECONDARY) where.parentBranchId = { not: null };

    const orderBy =
      sortBy && BRANCH_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [rawData, total] = await Promise.all([
      this.prisma.branch.findMany({ where, skip, take, orderBy, include: BRANCH_LIST_INCLUDE }),
      this.prisma.branch.count({ where }),
    ]);

    const productGroupsMap = await this.fetchProductGroupsMap(
      rawData.flatMap((branch) => branch.productGroupIds),
    );
    const data = rawData.map((branch) => this.serializeBranch(branch, productGroupsMap));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(
    branchDropdownFiltersDto: BranchDropdownFiltersDto,
  ): Promise<{ id: string; name: string; cityId: string }[]> {
    const { cityId, type } = branchDropdownFiltersDto;

    return this.prisma.branch.findMany({
      where: {
        status: TerritoryStatus.ACTIVE,
        ...(cityId && { cityId }),
        ...(type === BranchType.PRIMARY && { parentBranchId: null }),
        ...(type === BranchType.SECONDARY && { parentBranchId: { not: null } }),
      },
      select: { id: true, name: true, cityId: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(branchId: string): Promise<BranchDetail | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: BRANCH_DETAIL_INCLUDE,
    });

    if (!branch) return null;

    const productGroupsMap = await this.fetchProductGroupsMap(branch.productGroupIds);
    return this.serializeBranch(branch, productGroupsMap);
  }

  async create(data: Prisma.BranchCreateInput): Promise<BranchDetail> {
    const branch = await this.prisma.branch.create({ data, include: BRANCH_DETAIL_INCLUDE });
    const productGroupsMap = await this.fetchProductGroupsMap(branch.productGroupIds);
    return this.serializeBranch(branch, productGroupsMap);
  }

  async update(branchId: string, data: Prisma.BranchUpdateInput): Promise<BranchDetail> {
    const branch = await this.prisma.branch.update({
      where: { id: branchId },
      data,
      include: BRANCH_DETAIL_INCLUDE,
    });
    const productGroupsMap = await this.fetchProductGroupsMap(branch.productGroupIds);
    return this.serializeBranch(branch, productGroupsMap);
  }

  async delete(branchId: string): Promise<void> {
    await this.prisma.branch.delete({ where: { id: branchId } });
  }

  async hasAreas(branchId: string): Promise<boolean> {
    const count = await this.prisma.area.count({ where: { branchId } });
    return count > 0;
  }

  // The hierarchy is capped at two levels — Primary (no parent, buys from
  // the Factory) and Secondary (parent is always a Primary branch). A branch
  // that already has children is a Primary, and must stay one.
  async hasChildBranches(branchId: string): Promise<boolean> {
    const count = await this.prisma.branch.count({ where: { parentBranchId: branchId } });
    return count > 0;
  }

  // The branch a given Employee currently runs as its distributor — how the
  // branch-stock modules resolve "which branch is this logged-in user acting
  // for" without a separate assignment table (Branch.distributorId is unique,
  // so at most one branch can ever match).
  async findByDistributorId(distributorId: string): Promise<BranchDetail | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { distributorId },
      include: BRANCH_DETAIL_INCLUDE,
    });

    if (!branch) return null;

    const productGroupsMap = await this.fetchProductGroupsMap(branch.productGroupIds);
    return this.serializeBranch(branch, productGroupsMap);
  }

  async findTreeById(branchId: string): Promise<BranchTree | null> {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
      select: BRANCH_TREE.select,
    });
  }

  // Per-city exclusivity: a product group may only be held by one branch
  // within the same city. Finds another branch in `cityId` that already
  // holds any of `productGroupIds`, if one exists.
  async findConflictingProductGroupBranch(
    cityId: string,
    productGroupIds: string[],
    excludeBranchId?: string,
  ): Promise<{ id: string; name: string } | null> {
    return this.prisma.branch.findFirst({
      where: {
        cityId,
        productGroupIds: { hasSome: productGroupIds },
        ...(excludeBranchId && { id: { not: excludeBranchId } }),
      },
      select: { id: true, name: true },
    });
  }

  // Branch.productGroupIds has no Prisma relation (see schema comment), so
  // resolved ProductGroup details are attached here instead of via `include`.
  private async fetchProductGroupsMap(ids: string[]): Promise<Record<string, ProductGroupSummary>> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return {};

    const productGroups = await this.prisma.productGroup.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, status: true },
    });

    return Object.fromEntries(productGroups.map((productGroup) => [productGroup.id, productGroup]));
  }

  private serializeBranch<T extends RawBranchDetail | RawBranchListItem>(
    branch: T,
    productGroupsMap: Record<string, ProductGroupSummary>,
  ): T & { productGroups: ProductGroupSummary[] } {
    return {
      ...branch,
      productGroups: branch.productGroupIds
        .map((id) => productGroupsMap[id])
        .filter((productGroup): productGroup is ProductGroupSummary => Boolean(productGroup)),
    };
  }
}
