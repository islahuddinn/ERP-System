import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PurchaseReturnService } from "./purchase-return.service";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { UpdatePurchaseReturnDto } from "./dto/update-purchase-return.dto";
import { UpdateReturnStatusDto } from "./dto/update-return-status.dto";
import { DecideReturnApprovalDto } from "./dto/decide-return-approval.dto";
import { PurchaseReturnQueryDto } from "./dto/purchase-return-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditAction, AuditModule } from "@prisma/tenant-client";

@ApiTags("Purchase Returns")
@Controller("purchase-returns")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PurchaseReturnController {
  constructor(private readonly returnService: PurchaseReturnService) {}

  @Auditable({ module: AuditModule.PURCHASE_RETURNS })
  @Post()
  @RequirePermission("purchases.create")
  @ApiOperation({ summary: "Create a new purchase return (starts as DRAFT)" })
  create(@Body() dto: CreatePurchaseReturnDto, @Req() req: RequestWithUser) {
    return this.returnService.create(dto, req);
  }

  @Get()
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "List purchase returns with filters and pagination" })
  findAll(@Query() queryDto: PurchaseReturnQueryDto) {
    return this.returnService.findAll(queryDto);
  }

  @Get(":returnId")
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Get a single purchase return by ID" })
  findOne(@Param("returnId") returnId: string) {
    return this.returnService.findOne(returnId);
  }

  @Auditable({ module: AuditModule.PURCHASE_RETURNS })
  @Patch(":returnId")
  @RequirePermission("purchases.update")
  @ApiOperation({ summary: "Update a DRAFT purchase return (header + items diff)" })
  update(
    @Param("returnId") returnId: string,
    @Body() dto: UpdatePurchaseReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.returnService.update(returnId, dto, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_RETURNS, action: AuditAction.UPDATE })
  @Patch(":returnId/status")
  @RequirePermission("purchases.update")
  @ApiOperation({
    summary:
      "Transition return status (APPROVED | REJECTED | COMPLETED | CANCELLED) from DRAFT. Provide reason when rejecting. Returns with approvers must use the approve endpoint instead.",
  })
  updateStatus(
    @Param("returnId") returnId: string,
    @Body() dto: UpdateReturnStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.returnService.updateStatus(returnId, dto, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_RETURNS, action: AuditAction.APPROVE })
  @Post(":returnId/approve")
  @RequirePermission("purchases.approve")
  @ApiOperation({
    summary:
      "Record the logged-in user's approval/rejection decision for a purchase return; once all assigned approvers approve, the return is auto-approved",
  })
  approve(
    @Param("returnId") returnId: string,
    @Body() dto: DecideReturnApprovalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.returnService.approve(returnId, dto, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_RETURNS })
  @Delete(":returnId")
  @RequirePermission("purchases.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a DRAFT purchase return" })
  remove(@Param("returnId") returnId: string, @Req() req: RequestWithUser) {
    return this.returnService.remove(returnId, req);
  }
}
