import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { CompaniesService } from "./companies.service";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

@ApiTags("Companies")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermission("companies.read")
  @ApiOperation({ summary: "List companies with pagination and filtering" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
    example: 10,
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by name or code",
  })
  @ApiQuery({
    name: "isActive",
    required: false,
    type: Boolean,
    description: "Filter by active status",
  })
  @ApiResponse({ status: 200, description: "Companies retrieved successfully" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
    type: ErrorResponseDto,
  })
  findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
  ) {
    // Convert query params: only convert to number if provided and not empty
    // Empty strings and undefined should both be treated as undefined
    const pageNum = page && page.trim() !== "" ? Number(page) : undefined;
    const limitNum = limit && limit.trim() !== "" ? Number(limit) : undefined;

    return this.companiesService.findAll(tenantClient, {
      page: pageNum,
      limit: limitNum,
      search,
      isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true",
    });
  }

  @Post()
  @RequirePermission("companies.create")
  @ApiOperation({ summary: "Create a new company" })
  @ApiResponse({ status: 201, description: "Company created successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Validation failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Company with this name already exists",
    type: ErrorResponseDto,
  })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.companiesService.create(
      tenantClient,
      createCompanyDto.name,
      createCompanyDto.code,
      userId,
    );
  }

  @Get(":id")
  @RequirePermission("companies.read")
  @ApiOperation({ summary: "Get company by ID" })
  @ApiParam({ name: "id", description: "Company ID", type: String })
  @ApiResponse({ status: 200, description: "Company retrieved successfully" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.companiesService.findOne(tenantClient, id);
  }

  @Patch(":id")
  @RequirePermission("companies.update")
  @ApiOperation({ summary: "Update company" })
  @ApiParam({ name: "id", description: "Company ID", type: String })
  @ApiResponse({ status: 200, description: "Company updated successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Validation failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Company with this name already exists",
    type: ErrorResponseDto,
  })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.companiesService.update(tenantClient, id, updateCompanyDto, userId);
  }

  @Delete(":id")
  @RequirePermission("companies.delete")
  @ApiOperation({ summary: "Delete company" })
  @ApiParam({ name: "id", description: "Company ID", type: String })
  @ApiResponse({ status: 200, description: "Company deleted successfully" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Cannot delete company with associated products",
    type: ErrorResponseDto,
  })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.companiesService.softDelete(tenantClient, id);
  }

}
