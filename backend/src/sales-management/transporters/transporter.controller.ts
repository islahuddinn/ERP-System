import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { CreateTransporterDto } from "./dto/create-transporter.dto";
import { UpdateTransporterDto } from "./dto/update-transporter.dto";
import { TransporterFiltersDto } from "./dto/transporter-filters.dto";
import { TransporterService } from "./transporter.service";

@ApiTags("Sales Management - Transporters")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/transporters")
export class TransporterController {
  constructor(private readonly transporterService: TransporterService) {}

  @Get()
  @RequirePermission("transporter.view")
  @ApiOperation({ summary: "List transporters with pagination and filters" })
  listTransporters(@Query() transporterFiltersDto: TransporterFiltersDto) {
    return this.transporterService.listTransporters(transporterFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("transporter.view")
  @ApiOperation({ summary: "Dropdown list of active transporters" })
  dropdown() {
    return this.transporterService.dropdown();
  }

  @Get(":transporterId")
  @RequirePermission("transporter.view")
  @ApiOperation({ summary: "Get transporter by ID" })
  getTransporter(@Param("transporterId", ParseUUIDPipe) transporterId: string) {
    return this.transporterService.getTransporter(transporterId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_TRANSPORTERS })
  @Post()
  @RequirePermission("transporter.manage")
  @ApiOperation({ summary: "Create a new transporter" })
  createTransporter(@Body() createTransporterDto: CreateTransporterDto) {
    return this.transporterService.createTransporter(createTransporterDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_TRANSPORTERS })
  @Patch(":transporterId")
  @RequirePermission("transporter.manage")
  @ApiOperation({ summary: "Update a transporter" })
  updateTransporter(
    @Param("transporterId", ParseUUIDPipe) transporterId: string,
    @Body() updateTransporterDto: UpdateTransporterDto,
  ) {
    return this.transporterService.updateTransporter(transporterId, updateTransporterDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_TRANSPORTERS })
  @Delete(":transporterId")
  @RequirePermission("transporter.manage")
  @ApiOperation({ summary: "Delete a transporter" })
  async deleteTransporter(@Param("transporterId", ParseUUIDPipe) transporterId: string) {
    await this.transporterService.deleteTransporter(transporterId);
    return { message: "Transporter deleted successfully" };
  }
}
