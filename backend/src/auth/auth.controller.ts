import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  Get,
  Param,
  Patch,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Express } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";
import { ILoginResponse } from "./utils/interfaces";
import { RequestWithUser, ResponseDto } from "src/common/interfaces";

const brandingUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_: any, file: Express.Multer.File, cb: CallableFunction) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    cb(
      allowed.includes(file.mimetype)
        ? null
        : new BadRequestException("Only PNG, JPEG, and WEBP files are allowed."),
      allowed.includes(file.mimetype),
    );
  },
};

@ApiTags(`Authentication`)
@Controller(`auth`)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get(`test-connection/:tenantId`)
  @UseGuards(JwtAuthGuard)
  async testConnection(@Param(`tenantId`) tenantId: string, @Request() req: RequestWithUser) {
    return await this.authService.testConnection(tenantId, req);
  }

  @UseGuards(LocalAuthGuard)
  @Post(`login`)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: RequestWithUser,
  ): Promise<ResponseDto<ILoginResponse>> {
    return this.authService.login(req, loginDto);
  }

  @Get(`branding`)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current tenant's branding (display name and logo)" })
  async getBranding(@Request() req: RequestWithUser) {
    return this.authService.getBranding(req.user);
  }

  @Patch(`branding`)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("logo", brandingUploadOptions))
  @ApiOperation({ summary: "Update the current tenant's branding name and/or logo" })
  async updateBranding(
    @Body() updateBrandingDto: UpdateBrandingDto,
    @Request() req: RequestWithUser,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.authService.updateBranding(req.user, updateBrandingDto, logo);
  }
}
