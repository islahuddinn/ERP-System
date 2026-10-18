import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { LocationsService } from "./locations.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationsQueryDto } from "./dto/locations-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Locations")
@Controller("locations")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Auditable({ module: AuditModule.LOCATIONS })
  @Post()
  @RequirePermission("locations.create")
  @ApiOperation({ summary: "Create a new location" })
  create(@Body() createDto: CreateLocationDto, @Req() req: RequestWithUser) {
    return this.locationsService.create(createDto, req);
  }

  @Get("dropdown")
  @RequirePermission("locations.read")
  dropdown() {
    return this.locationsService.dropdown();
  }

  @Get()
  @RequirePermission("locations.read")
  findAll(@Query() query: LocationsQueryDto) {
    return this.locationsService.findAll(query);
  }

  @Get(":locationId")
  @RequirePermission("locations.read")
  @ApiOperation({ summary: "Get a location by ID" })
  findOne(@Param("locationId") locationId: string) {
    return this.locationsService.findOne(locationId);
  }

  @Auditable({ module: AuditModule.LOCATIONS })
  @Patch(":locationId")
  @RequirePermission("locations.update")
  @ApiOperation({ summary: "Update a location" })
  update(@Param("locationId") locationId: string, @Body() updateDto: UpdateLocationDto) {
    return this.locationsService.update(locationId, updateDto);
  }

  @Auditable({ module: AuditModule.LOCATIONS })
  @Delete(":locationId")
  @RequirePermission("locations.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a location (only if it has no linked records)" })
  remove(@Param("locationId") locationId: string) {
    return this.locationsService.remove(locationId);
  }
}
