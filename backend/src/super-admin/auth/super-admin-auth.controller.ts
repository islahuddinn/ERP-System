import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  Patch,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { SuperAdminAuthService } from "./super-admin-auth.service";
import { SuperAdminLocalAuthGuard } from "./guards/super-admin-local-auth.guard";
import { SuperAdminJwtAuthGuard } from "./guards/super-admin-jwt-auth.guard";
import { SuperAdminLoginDto } from "./dto/super-admin-login.dto";
import { RequestWithSuperAdminUser, ResponseDto } from "src/common/interfaces";
import { SuperAdminUpdatePasswordDto } from "./dto/super-admin-update-password.dto";
import { SuperAdminBootstrapDto } from "./dto/super-admin-bootstrap.dto";

@ApiTags(`Super Admin Authentication`)
@Controller(`super-admin/auth`)
export class SuperAdminAuthController {
  constructor(private superAdminAuthService: SuperAdminAuthService) {}

  @UseGuards(SuperAdminLocalAuthGuard)
  @Post(`login`)
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: "Super admin login" })
  async login(@Body() loginDto: SuperAdminLoginDto, @Req() req: RequestWithSuperAdminUser) {
    return this.superAdminAuthService.login(req.user);
  }

  @Get(`bootstrap-status`)
  @ApiOperation({ summary: "Whether first-time super admin setup is available" })
  getBootstrapStatus() {
    return this.superAdminAuthService.getBootstrapStatus();
  }

  @Post(`bootstrap`)
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Create the first super admin when none exist" })
  bootstrap(@Body() superAdminBootstrapDto: SuperAdminBootstrapDto) {
    return this.superAdminAuthService.bootstrapFirstSuperAdmin(superAdminBootstrapDto);
  }

  @UseGuards(SuperAdminJwtAuthGuard)
  @Get(`profile`)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current super admin profile" })
  getProfile(@Request() req: RequestWithSuperAdminUser) {
    return req.user;
  }

  @UseGuards(SuperAdminJwtAuthGuard)
  @Patch(`password`)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update super admin password" })
  updatePassword(
    @Req() req: RequestWithSuperAdminUser,
    @Body() superAdminUpdatePasswordDto: SuperAdminUpdatePasswordDto,
  ) {
    return this.superAdminAuthService.updatePassword(req, superAdminUpdatePasswordDto);
  }

  @UseGuards(SuperAdminJwtAuthGuard)
  @Post(`refresh`)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Refresh super admin access token" })
  async refresh(
    @Req() req: RequestWithSuperAdminUser,
  ): Promise<ResponseDto<{ access_token: string }>> {
    return this.superAdminAuthService.refreshToken(req.user);
  }
}
