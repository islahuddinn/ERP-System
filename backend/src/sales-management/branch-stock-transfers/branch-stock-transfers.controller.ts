import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { BranchStockTransfersService } from "./branch-stock-transfers.service";
import { BranchStockTransferFiltersDto } from "./dto/branch-stock-transfer-filters.dto";
import { ConfirmBranchStockTransferReceiptDto } from "./dto/confirm-branch-stock-transfer-receipt.dto";

@ApiTags("Sales Management - Branch Stock Transfers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-stock-transfers")
export class BranchStockTransfersController {
  constructor(private readonly branchStockTransfersService: BranchStockTransfersService) {}

  @Get()
  @RequirePermission("branch-stock-transfer.view", "branch-stock-operations.view", "branch-stock-operations.manage")
  @ApiOperation({ summary: "List branch stock transfers with pagination and filters" })
  listBranchStockTransfers(@Query() branchStockTransferFiltersDto: BranchStockTransferFiltersDto) {
    return this.branchStockTransfersService.listBranchStockTransfers(branchStockTransferFiltersDto);
  }

  @Get(":transferId")
  @RequirePermission("branch-stock-transfer.view", "branch-stock-operations.view", "branch-stock-operations.manage")
  @ApiOperation({ summary: "Get a branch stock transfer by ID, with its items" })
  getBranchStockTransfer(@Param("transferId", ParseUUIDPipe) transferId: string) {
    return this.branchStockTransfersService.getBranchStockTransfer(transferId);
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_TRANSFERS })
  @Patch(":transferId/confirm-receipt")
  @RequirePermission("branch-stock-transfer.confirm-receipt", "branch-stock-operations.manage")
  @ApiOperation({
    summary:
      "Confirm receipt of a dispatched transfer. Every item's actually-received quantity must be given — it may be less than what was dispatched (damage/loss in transit). Stock and the ledger debit are both based on what's stated here, not on the dispatched quantity",
  })
  confirmBranchStockTransferReceipt(
    @Param("transferId", ParseUUIDPipe) transferId: string,
    @Body() confirmBranchStockTransferReceiptDto: ConfirmBranchStockTransferReceiptDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockTransfersService.confirmBranchStockTransferReceipt(
      transferId,
      confirmBranchStockTransferReceiptDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.BRANCH_STOCK_TRANSFERS })
  @Patch(":transferId/cancel")
  @RequirePermission("branch-stock-transfer.cancel", "branch-stock-operations.manage")
  @ApiOperation({
    summary:
      "Cancel a dispatched transfer — reverses the stock it took out of the source. Requires branch-stock-operations.manage; RECEIVED and CANCELLED transfers can't be cancelled",
  })
  cancelBranchStockTransfer(
    @Param("transferId", ParseUUIDPipe) transferId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchStockTransfersService.cancelBranchStockTransfer(transferId, req);
  }
}
