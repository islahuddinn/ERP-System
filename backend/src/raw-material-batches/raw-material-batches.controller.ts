import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { RawMaterialBatchesService } from "./raw-material-batches.service";
import {
  QueryRawMaterialBatchDto,
  FifoAllocationQueryDto,
  ConsumeBatchDto,
} from "./dto/query-raw-material-batch.dto";
import {
  CreateRawMaterialBatchInspectionDto,
  UpdateRawMaterialBatchInspectionDto,
} from "./dto/raw-material-batch-inspection.dto";
import { UpdateRawMaterialBatchDto } from "./dto/update-raw-material-batch.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "src/common/interfaces";

@ApiTags("Raw Material Batches")
@Controller("raw-material-batches")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RawMaterialBatchesController {
  constructor(private readonly service: RawMaterialBatchesService) {}

  @Get()
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get all raw material batches with pagination and filters" })
  findAll(@Query() queryRawMaterialBatchDto: QueryRawMaterialBatchDto) {
    return this.service.findAll(queryRawMaterialBatchDto);
  }

  @Get("expiring")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get raw material batches expiring within X days" })
  @ApiQuery({ name: "days", required: false, example: 30 })
  findExpiring(@Query("days") days?: string) {
    return this.service.findExpiring(days ? parseInt(days, 10) : 30);
  }

  @Get("fifo/:rawMaterialId")
  @RequirePermission("stock.read")
  @ApiOperation({
    summary:
      "Get FIFO/FEFO batch allocation for a raw material — returns ordered batches to consume",
  })
  getFifoAllocation(
    @Param("rawMaterialId", ParseUUIDPipe) rawMaterialId: string,
    @Query() fifoAllocationQueryDto: FifoAllocationQueryDto,
  ) {
    return this.service.getFifoAllocation(rawMaterialId, fifoAllocationQueryDto.quantity);
  }

  @Get(":batchId")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get a raw material batch by ID" })
  findOne(@Param("batchId") batchId: string) {
    return this.service.findOne(batchId);
  }

  @Get(":batchId/consumptions")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get consumption history for a batch" })
  getConsumptions(@Param("batchId") batchId: string) {
    return this.service.getConsumptions(batchId);
  }

  @Patch(":batchId")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.RAW_MATERIAL_BATCHES, entity: "RawMaterialBatch" })
  @ApiOperation({
    summary:
      "Update batch notes, or manually override status to BLOCKED (hold) or QUARANTINE (re-inspect)",
  })
  update(
    @Param("batchId") batchId: string,
    @Body() body: UpdateRawMaterialBatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(batchId, body, req.user.id);
  }

  @Post(":batchId/consume")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.RAW_MATERIAL_BATCHES, entity: "RawMaterialBatch" })
  @ApiOperation({ summary: "Consume quantity from a batch (deducts from stock, records history)" })
  consume(
    @Param("batchId") batchId: string,
    @Body() consumeBatchDto: ConsumeBatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.consume(batchId, consumeBatchDto, req.user.id);
  }

  @Post(":batchId/inspections")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.RAW_MATERIAL_BATCHES, entity: "RawMaterialBatchInspection" })
  @ApiOperation({
    summary:
      "Submit a quality inspection for a batch (moves batch out of QUARANTINE based on result)",
  })
  createInspection(
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() createInspectionDto: CreateRawMaterialBatchInspectionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createInspection(batchId, createInspectionDto, req.user.id);
  }

  @Get(":batchId/inspections")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get inspection history for a batch" })
  getInspections(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.service.getInspections(batchId);
  }

  @Patch("inspections/:inspectionId")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.RAW_MATERIAL_BATCHES, entity: "RawMaterialBatchInspection" })
  @ApiOperation({ summary: "Update a batch inspection record" })
  updateInspection(
    @Param("inspectionId", ParseUUIDPipe) inspectionId: string,
    @Body() updateInspectionDto: UpdateRawMaterialBatchInspectionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateInspection(inspectionId, updateInspectionDto, req.user.id);
  }
}
