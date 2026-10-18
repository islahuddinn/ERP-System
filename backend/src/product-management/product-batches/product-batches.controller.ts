/**
 * PRODUCT BATCH LIFECYCLE
 * ──────────────────────────────────────────────────────────────────────────
 * A ProductBatch is created automatically when a ProductionOrder is completed.
 * It begins with one stage ("Production") already IN_PROGRESS.
 *
 * A stage represents a physical processing step (Production, Packing, QC …)
 * that can span multiple days. Workers start it on day 1 and complete it
 * when the physical work is done (day N). Only ONE stage can be in progress
 * at a time.
 *
 * Typical flow
 * ────────────
 * 1. [Production Order] → Complete → Batch created, "Production" stage IN_PROGRESS
 *
 * 2. [Days pass — physical production happening]
 *
 * 3. PATCH  /stages/:stageId/complete   → record approved / rejected qty + cost
 *                                          batch.availableQuantity is now restored
 *
 * 4. (Optional — if more processing is needed, e.g. Packing)
 *    POST   /stages/start               → lock qty into new "Packing" stage (IN_PROGRESS)
 *    [Days pass]
 *    PATCH  /stages/:stageId/complete   → record results for Packing
 *    Repeat for as many stages as needed
 *
 * 5. PATCH  /finalize                   → set retail price / expiry date, push qty to stock
 *                                          if the last stage is still IN_PROGRESS it is
 *                                          auto-completed with full approval before finalizing
 *
 * Correction at any point
 * ───────────────────────
 * PATCH /stages/:stageId/cancel  → reverts the latest stage (IN_PROGRESS or COMPLETED)
 *                                   and restores the batch to the previous stage's state.
 *                                   Only the latest stage can be cancelled.
 *                                   Cannot cancel the initial "Production" stage.
 *                                   Cannot cancel any stage once the batch is finalized.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { ProductBatchesService } from "./product-batches.service";
import { QueryProductBatchDto } from "./dto/query-product-batch.dto";
import { StartProductBatchStageDto } from "./dto/start-product-batch-stage.dto";
import { CompleteProductBatchStageDto } from "./dto/complete-product-batch-stage.dto";
import { FinalizeProductBatchDto } from "./dto/finalize-product-batch.dto";
import { UpdateProductBatchDto } from "./dto/update-product-batch.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "src/common/interfaces";

@ApiTags("Product Batches")
@Controller("product-management/product-batches")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  // ── Batch: Read ──────────────────────────────────────────────────────────

  @Get()
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "List all product batches with pagination and filters" })
  findAll(@Query() queryProductBatchDto: QueryProductBatchDto) {
    return this.productBatchesService.findAll(queryProductBatchDto);
  }

  @Get("stock-summary/:productId")
  @RequirePermission("stock.read")
  @ApiOperation({
    summary: "Stage-wise stock breakdown for a product — how many units are at each stage",
  })
  getStockByProduct(@Param("productId", ParseUUIDPipe) productId: string) {
    return this.productBatchesService.getStockByProduct(productId);
  }

  @Get("stages")
  @RequirePermission("stock.read")
  @ApiOperation({
    summary: "Get the distinct current-stage values across product batches (for filter options)",
  })
  getDistinctStages() {
    return this.productBatchesService.getDistinctStages();
  }

  @Get(":productBatchId")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get a single product batch with all its stages" })
  findOne(@Param("productBatchId", ParseUUIDPipe) productBatchId: string) {
    return this.productBatchesService.findOne(productBatchId);
  }

  // ── Batch: Write ─────────────────────────────────────────────────────────

  @Patch(":productBatchId/finalize")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.PRODUCT_BATCHES, entity: "ProductBatch" })
  @ApiOperation({
    summary:
      "Finalize the batch — set retail price, sale price, manufacturing / expiry dates, " +
      "and push the approved quantity into Product stock. " +
      "Call this once all processing stages are done. " +
      "If the last stage is still IN_PROGRESS it is auto-completed with full approval.",
  })
  finalizeBatch(
    @Param("productBatchId", ParseUUIDPipe) productBatchId: string,
    @Body() dto: FinalizeProductBatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productBatchesService.finalizeBatch(productBatchId, dto, req);
  }

  @Patch(":productBatchId")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.PRODUCT_BATCHES, entity: "ProductBatch" })
  @ApiOperation({
    summary:
      "Manual override — update retail / sale price, notes, or status (e.g. BLOCKED, QUARANTINE). " +
      "Does not affect stage flow or stock.",
  })
  update(
    @Param("productBatchId", ParseUUIDPipe) productBatchId: string,
    @Body() dto: UpdateProductBatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productBatchesService.update(productBatchId, dto, req.user.id);
  }

  // ── Stages ───────────────────────────────────────────────────────────────
  //
  // A stage (Production, Packing, QC …) tracks a physical processing step
  // that can span multiple days.
  //
  // Rules:
  //   • Only ONE stage can be IN_PROGRESS at a time.
  //   • You must complete (or cancel) the current IN_PROGRESS stage before
  //     starting the next one.
  //   • Only the latest stage can be cancelled.
  //   • The initial "Production" stage cannot be cancelled (no prior state).
  //   • Stages cannot be cancelled once the batch is finalized.

  @Post(":productBatchId/stages/start")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.PRODUCT_BATCHES, entity: "ProductBatch" })
  @ApiOperation({
    summary:
      "Start a new processing stage (e.g. Packing, QC). " +
      "Locks the batch's current available quantity into this stage — " +
      "quantity is unavailable until the stage is completed. " +
      "The previous stage must already be completed before calling this.",
  })
  startStage(
    @Param("productBatchId", ParseUUIDPipe) productBatchId: string,
    @Body() dto: StartProductBatchStageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productBatchesService.startStage(productBatchId, dto, req);
  }

  @Patch(":productBatchId/stages/:stageId/complete")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.PRODUCT_BATCHES, entity: "ProductBatch" })
  @ApiOperation({
    summary:
      "Complete the IN_PROGRESS stage — record approved quantity, rejected quantity, " +
      "and any additional cost (labour, packaging, etc.). " +
      "costPerUnit is automatically recomputed. " +
      "Call this when the physical processing step is finished.",
  })
  completeStage(
    @Param("productBatchId", ParseUUIDPipe) productBatchId: string,
    @Param("stageId", ParseUUIDPipe) stageId: string,
    @Body() dto: CompleteProductBatchStageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productBatchesService.completeStage(productBatchId, stageId, dto, req);
  }

  @Patch(":productBatchId/stages/:stageId/cancel")
  @RequirePermission("stock.update")
  @Auditable({ module: AuditModule.PRODUCT_BATCHES, entity: "ProductBatch" })
  @ApiOperation({
    summary:
      "Cancel the latest stage and revert the batch to its previous stage state. " +
      "Use this to correct a mistake (wrong stage name, wrong quantities, etc.). " +
      "Only the most recent stage can be cancelled.",
  })
  cancelStage(
    @Param("productBatchId", ParseUUIDPipe) productBatchId: string,
    @Param("stageId", ParseUUIDPipe) stageId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.productBatchesService.cancelStage(productBatchId, stageId, req);
  }
}
