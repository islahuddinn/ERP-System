import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BranchType, PriceListTier, Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { CityService } from "../city/city.service";
import { EmployeeService } from "../../hr/employee/employee.service";
import { BranchRepository } from "./branch.repository";
import { BranchDetail, BranchListItem, BranchTree } from "./utils/types";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { BranchFiltersDto } from "./dto/branch-filters.dto";
import { BranchDropdownFiltersDto } from "./dto/branch-dropdown-filters.dto";

@Injectable()
export class BranchService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly cityService: CityService,
    private readonly employeeService: EmployeeService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listBranches(
    branchFiltersDto: BranchFiltersDto,
  ): Promise<PaginatedResponse<BranchListItem>> {
    return this.branchRepository.findAll(branchFiltersDto);
  }

  async dropdown(
    branchDropdownFiltersDto: BranchDropdownFiltersDto,
  ): Promise<{ id: string; name: string; cityId: string }[]> {
    return this.branchRepository.dropdown(branchDropdownFiltersDto);
  }

  async listDistributorOptions(): Promise<
    Awaited<ReturnType<EmployeeService["distributorDropdown"]>>
  > {
    return this.employeeService.distributorDropdown();
  }

  async getBranch(branchId: string): Promise<BranchDetail> {
    return this.checkExistence(branchId);
  }

  async createBranch(createBranchDto: CreateBranchDto): Promise<BranchDetail> {
    const {
      code,
      name,
      cityId,
      distributorId,
      address,
      productGroupIds,
      status,
      priceTier,
      parentBranchId,
      type,
    } = createBranchDto;

    await this.cityService.checkExistence(cityId);
    await this.employeeService.checkExistence(distributorId);
    await this.assertProductGroupsAvailable(cityId, productGroupIds);
    this.assertTypeMatchesParent(type, parentBranchId);

    if (parentBranchId) {
      await this.assertParentIsPrimaryBranch(parentBranchId);
    }

    const branchType = parentBranchId ? BranchType.SECONDARY : BranchType.PRIMARY;
    const resolvedPriceTier =
      priceTier ??
      (branchType === BranchType.PRIMARY
        ? PriceListTier.DISTRIBUTOR_PRICE
        : PriceListTier.TRADE_PRICE);

    const payload: Prisma.BranchCreateInput = {
      code,
      name,
      address,
      productGroupIds,
      // Never persist the caller's raw `type` — it's only a declared-intent
      // check (see assertTypeMatchesParent). The stored value is always
      // derived from parentBranchId so the two can never drift apart.
      type: branchType,
      priceTier: resolvedPriceTier,
      city: { connect: { id: cityId } },
      distributor: { connect: { id: distributorId } },
      ...(status && { status }),
      ...(parentBranchId && { parentBranch: { connect: { id: parentBranchId } } }),
    };

    try {
      return await this.branchRepository.create(payload);
    } catch (error) {
      this.throwOnBranchUniqueViolation(error);
    }
  }

  async updateBranch(branchId: string, updateBranchDto: UpdateBranchDto): Promise<BranchDetail> {
    const existingBranch = await this.checkExistence(branchId);

    this.auditContext.setOldValue(existingBranch);
    this.auditContext.setEntityLabel(existingBranch.name);

    const {
      code,
      name,
      cityId,
      distributorId,
      address,
      productGroupIds,
      status,
      priceTier,
      parentBranchId,
      type,
    } = updateBranchDto;

    if (cityId) {
      await this.cityService.checkExistence(cityId);
    }

    if (distributorId) {
      await this.employeeService.checkExistence(distributorId);
    }

    if (productGroupIds) {
      await this.assertProductGroupsAvailable(
        cityId ?? existingBranch.cityId,
        productGroupIds,
        branchId,
      );
    }

    if (type !== undefined) {
      const effectiveParentBranchId =
        parentBranchId !== undefined ? parentBranchId : existingBranch.parentBranchId;
      this.assertTypeMatchesParent(type, effectiveParentBranchId);
    }

    if (parentBranchId) {
      await this.assertValidParentBranch(branchId, parentBranchId);
    }

    const updateData: Prisma.BranchUpdateInput = {
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(productGroupIds !== undefined && { productGroupIds }),
      ...(cityId !== undefined && { city: { connect: { id: cityId } } }),
      ...(distributorId !== undefined && { distributor: { connect: { id: distributorId } } }),
      ...(status !== undefined && { status }),
      ...(priceTier !== undefined && { priceTier }),
      // Same rule as create — parentBranchId drives `type`, never the
      // caller's raw value. Only SECONDARY is reachable here today since
      // there's no way yet to clear parentBranchId back to null.
      ...(parentBranchId !== undefined && {
        parentBranch: { connect: { id: parentBranchId } },
        type: BranchType.SECONDARY,
      }),
    };

    try {
      return await this.branchRepository.update(branchId, updateData);
    } catch (error) {
      this.throwOnBranchUniqueViolation(error);
    }
  }

  async deleteBranch(branchId: string): Promise<void> {
    const existingBranch = await this.checkExistence(branchId);

    if (await this.branchRepository.hasAreas(branchId)) {
      throw new BadRequestException("Cannot delete a branch that has areas assigned to it");
    }

    this.auditContext.setOldValue(existingBranch);
    this.auditContext.setEntityLabel(existingBranch.name);

    await this.branchRepository.delete(branchId);
  }

  async getBranchTree(branchId: string): Promise<BranchTree> {
    await this.checkExistence(branchId);
    const branchTree = await this.branchRepository.findTreeById(branchId);
    return branchTree as BranchTree;
  }

  async checkExistence(branchId: string): Promise<BranchDetail> {
    const branch = await this.branchRepository.findById(branchId);

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return branch;
  }

  // Resolves the branch a logged-in employee runs as its distributor.
  // Everything in the branch-stock modules that acts "on behalf of my
  // branch" (setting prices, requesting/approving stock) calls this first.
  async getBranchForDistributor(distributorId: string): Promise<BranchDetail> {
    const branch = await this.branchRepository.findByDistributorId(distributorId);

    if (!branch) {
      throw new BadRequestException("You are not the distributor of any branch");
    }

    return branch;
  }

  // The hierarchy is exactly two levels: Primary (parentBranchId null, buys
  // from the Factory) and Secondary (parentBranchId always points at a
  // Primary). So a parent must itself be a Primary branch — chaining
  // Secondary-under-Secondary is not allowed — and a branch that already has
  // children (i.e. is already a Primary) can't be turned into a Secondary,
  // since that would leave its children as Secondary-under-Secondary too.
  private async assertValidParentBranch(branchId: string, parentBranchId: string): Promise<void> {
    if (parentBranchId === branchId) {
      throw new BadRequestException("A branch cannot be its own parent");
    }

    await this.assertParentIsPrimaryBranch(parentBranchId);

    if (await this.branchRepository.hasChildBranches(branchId)) {
      throw new BadRequestException(
        "This branch already has child branches, so it must remain a top-level (Primary) branch",
      );
    }
  }

  private async assertParentIsPrimaryBranch(parentBranchId: string): Promise<void> {
    const parentBranch = await this.checkExistence(parentBranchId);

    if (parentBranch.type !== BranchType.PRIMARY) {
      throw new BadRequestException(
        "Parent branch must be a top-level (Primary) branch — a Secondary branch cannot itself be a parent",
      );
    }
  }

  // `type` is never trusted for the actual write (see createBranch/
  // updateBranch) — this only catches the caller stating an intent that
  // contradicts parentBranchId, e.g. sending type: PRIMARY alongside a
  // parentBranchId, or type: SECONDARY with none.
  private assertTypeMatchesParent(
    type: BranchType,
    parentBranchId: string | null | undefined,
  ): void {
    if (type === BranchType.PRIMARY && parentBranchId) {
      throw new BadRequestException("A Primary branch cannot have a parentBranchId");
    }

    if (type === BranchType.SECONDARY && !parentBranchId) {
      throw new BadRequestException("A Secondary branch must include a parentBranchId");
    }
  }

  // Translates a P2002 from creating/updating a branch into a clean 409. The
  // constraint target tells us which field collided — code, the (name,
  // cityId) pair, or distributorId (one distributor can only run one
  // branch) — so the client gets a precise message. Always routes through
  // the shared handlePrismaUniqueError helper (rule 6).
  private throwOnBranchUniqueViolation(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");

      if (targetText.includes("distributor_id") || targetText.includes("distributorId")) {
        handlePrismaUniqueError(error, "This distributor already runs another branch");
      }

      if (targetText.includes("code")) {
        handlePrismaUniqueError(error, "A branch with this code already exists");
      }

      if (targetText.includes("name")) {
        handlePrismaUniqueError(error, "A branch with this name already exists in this city");
      }
    }

    handlePrismaUniqueError(error);
  }

  private async assertProductGroupsAvailable(
    cityId: string,
    productGroupIds: string[],
    excludeBranchId?: string,
  ): Promise<void> {
    const conflictingBranch = await this.branchRepository.findConflictingProductGroupBranch(
      cityId,
      productGroupIds,
      excludeBranchId,
    );

    if (conflictingBranch) {
      throw new ConflictException(
        `One or more product groups are already assigned to branch "${conflictingBranch.name}" in this city`,
      );
    }
  }
}
