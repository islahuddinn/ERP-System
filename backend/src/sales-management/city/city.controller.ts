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
import { CityService } from "./city.service";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { CityFiltersDto } from "./dto/city-filters.dto";

@ApiTags("Sales Management - Cities")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/cities")
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @RequirePermission("sales-city.view")
  @ApiOperation({ summary: "List cities with pagination, search and zone filter" })
  listCities(@Query() cityFiltersDto: CityFiltersDto) {
    return this.cityService.listCities(cityFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("sales-city.view")
  @ApiOperation({ summary: "Dropdown list of active cities, optionally filtered by zone" })
  dropdown(@Query("zoneId") zoneId?: string) {
    return this.cityService.dropdown(zoneId);
  }

  @Get(":cityId")
  @RequirePermission("sales-city.view")
  @ApiOperation({ summary: "Get city by ID" })
  getCity(@Param("cityId", ParseUUIDPipe) cityId: string) {
    return this.cityService.getCity(cityId);
  }

  @Get(":cityId/tree")
  @RequirePermission("sales-city.view")
  @ApiOperation({ summary: "Get a city's full territory tree — branches and areas nested" })
  getCityTree(@Param("cityId", ParseUUIDPipe) cityId: string) {
    return this.cityService.getCityTree(cityId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
  @Post()
  @RequirePermission("sales-city.manage")
  @ApiOperation({ summary: "Create a new city under a zone" })
  createCity(@Body() createCityDto: CreateCityDto) {
    return this.cityService.createCity(createCityDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
  @Patch(":cityId")
  @RequirePermission("sales-city.manage")
  @ApiOperation({ summary: "Update a city" })
  updateCity(@Param("cityId", ParseUUIDPipe) cityId: string, @Body() updateCityDto: UpdateCityDto) {
    return this.cityService.updateCity(cityId, updateCityDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
  @Delete(":cityId")
  @RequirePermission("sales-city.manage")
  @ApiOperation({ summary: "Delete city — blocked if branches exist under it" })
  async deleteCity(@Param("cityId", ParseUUIDPipe) cityId: string) {
    await this.cityService.deleteCity(cityId);
    return { message: "City deleted successfully" };
  }
}
