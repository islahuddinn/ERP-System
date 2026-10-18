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
import { BranchStockRequestsService } from "./branch-stock-requests.service";
import { CreateBranchStockRequestDto } from "./dto/create-branch-stock-request.dto";
import { CreateBranchStockRequestTransferDto } from "./dto/create-branch-stock-request-transfer.dto";
import { BranchStockRequestFiltersDto } from "./dto/branch-stock-request-filters.dto";

@ApiTags("Sales Management - Branch Stock Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-stock-requests")
export class BranchStockRequestsController {
  constructor(private readonly branchStockRequestsService: BranchStockRequestsService) {}

  @Get()
  @RequirePermission(
    "branch-stock-request.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "List branch stock requests with pagination and filters" })
  listBranchStockRequests(@Query() branchStockRequestFiltersDto: BranchStockRequestFiltersDto) {
    return this.branchStockRequestsService.listBranchStockRequests(branchStockRequestFiltersDto);
  }

  @Get(":requestId")
  @RequirePermission(
    "branch-stock-request.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "Get a branch stock request by ID, with its items" })
  getBranchStockRequest(@Param("requestId", ParseUUIDPipe) requestId: string) {
    return this.branchStockRequestsService.getBranchStockRequest(requestId);
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_REQUESTS })
  @Post()
  @RequirePermission("branch-stock-request.create", "branch-stock-operations.manage")
  @ApiOperation({
    summary:
      "Request stock from my branch's parent (or the Factory, if I have none). Prices are resolved for every item immediately — the request is rejected if any item has no price",
  })
  createBranchStockRequest(
    @Body() createBranchStockRequestDto: CreateBranchStockRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockRequestsService.createBranchStockRequest(
      createBranchStockRequestDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_REQUESTS })
  @Patch(":requestId/approve")
  @RequirePermission(
    "branch-stock-request.approve",
    "branch-stock-request.approve-factory",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Approve a pending request. This only changes its status — it does not ship anything. Ship against it separately via POST :requestId/transfers. Approving a Factory-bound request additionally requires branch-stock-request.approve-factory",
  })
  approveBranchStockRequest(
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockRequestsService.approveBranchStockRequest(requestId, req);
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_TRANSFERS })
  @Post(":requestId/transfers")
  @RequirePermission(
    "branch-stock-request.approve",
    "branch-stock-request.approve-factory",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Ship a transfer against an approved request — creates it and dispatches it in one step, for any quantity up to what's still outstanding per item. Call it once for the full amount, or repeatedly for installment delivery / making up a previous shipment's shortfall",
  })
  shipBranchStockRequest(
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() createBranchStockRequestTransferDto: CreateBranchStockRequestTransferDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockRequestsService.shipBranchStockRequest(
      requestId,
      createBranchStockRequestTransferDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_REQUESTS })
  @Patch(":requestId/reject")
  @RequirePermission(
    "branch-stock-request.approve",
    "branch-stock-request.approve-factory",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Reject a pending request. Rejecting a Factory-bound request additionally requires branch-stock-request.approve-factory",
  })
  rejectBranchStockRequest(
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockRequestsService.rejectBranchStockRequest(requestId, req);
  }
}
