import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { BillService } from "../services/bill.service";
import { CreateBillDto } from "../dto/create-bill.dto";

@ApiTags("Accounts Payable - Bills")
@Controller(["financial/ap/bills", "ap/bills"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create a new bill" })
  @ApiResponse({ status: 201, description: "Bill created successfully" })
  create(@Body() createBillDto: CreateBillDto) {
    return this.billService.createBill(createBillDto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get all bills" })
  @ApiResponse({ status: 200, description: "Bills retrieved successfully" })
  findAll() {
    return this.billService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get bill by ID" })
  @ApiResponse({ status: 200, description: "Bill retrieved successfully" })
  findOne(@Param("id") id: string) {
    return this.billService.findOne(id);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete bill" })
  @ApiResponse({ status: 200, description: "Bill deleted successfully" })
  remove(@Param("id") id: string) {
    return this.billService.delete(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update bill" })
  @ApiResponse({ status: 200, description: "Bill updated successfully" })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<{ dueDate: Date; status: string }>,
  ) {
    return this.billService.update(id, dto);
  }
}
