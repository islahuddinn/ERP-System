import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { BranchStockReturnsService } from "./branch-stock-returns.service";
import { CreateBranchStockReturnDto } from "./dto/create-branch-stock-return.dto";
import { BranchStockReturnFiltersDto } from "./dto/branch-stock-return-filters.dto";

@ApiTags("Sales Management - Branch Stock Returns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-stock-returns")
export class BranchStockReturnsController {
  constructor(private readonly branchStockReturnsService: BranchStockReturnsService) {}

  @Get()
  @RequirePermission(
    "branch-stock-return.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "List branch stock returns with pagination and filters" })
  listBranchStockReturns(@Query() branchStockReturnFiltersDto: BranchStockReturnFiltersDto) {
    return this.branchStockReturnsService.listBranchStockReturns(branchStockReturnFiltersDto);
  }

  @Get(":returnId")
  @RequirePermission(
    "branch-stock-return.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "Get a branch stock return by ID, with its items" })
  getBranchStockReturn(@Param("returnId", ParseUUIDPipe) returnId: string) {
    return this.branchStockReturnsService.getBranchStockReturn(returnId);
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_RETURNS })
  @Post()
  @RequirePermission("branch-stock-return.create", "branch-stock-operations.manage")
  @ApiOperation({
    summary:
      "Return stock from my branch back to where it came from — against a RECEIVED transfer only. Each item's unit price is copied from the original transfer item, never re-entered. Created PENDING; no stock or ledger changes until approved",
  })
  createBranchStockReturn(
    @Body() createBranchStockReturnDto: CreateBranchStockReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockReturnsService.createBranchStockReturn(
      createBranchStockReturnDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_RETURNS })
  @Patch(":returnId/approve")
  @RequirePermission(
    "branch-stock-return.approve",
    "branch-stock-return.approve-factory",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Approve a pending return — moves stock back to the receiving branch (or Factory) and posts the ledger credit. Approving a Factory-bound return additionally requires branch-stock-return.approve-factory",
  })
  approveBranchStockReturn(
    @Param("returnId", ParseUUIDPipe) returnId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockReturnsService.approveBranchStockReturn(returnId, req);
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_RETURNS })
  @Patch(":returnId/reject")
  @RequirePermission(
    "branch-stock-return.approve",
    "branch-stock-return.approve-factory",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Reject a pending return — no stock or ledger changes. Rejecting a Factory-bound return additionally requires branch-stock-return.approve-factory",
  })
  rejectBranchStockReturn(
    @Param("returnId", ParseUUIDPipe) returnId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockReturnsService.rejectBranchStockReturn(returnId, req);
  }
}
