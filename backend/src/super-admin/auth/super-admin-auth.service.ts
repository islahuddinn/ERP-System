import { Injectable, NotFoundException, UnauthorizedException, ConflictException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import * as bcrypt from "bcrypt";
import {
  IAuthSuperAdminAccessTokenPayload,
  IBaseSuperAdmin,
  ISuperAdminLoginResponse,
} from "../utils/interfaces";
import { RequestWithSuperAdminUser, ResponseDto } from "src/common/interfaces";
import { SuperAdminUpdatePasswordDto } from "./dto/super-admin-update-password.dto";
import { SuperAdminBootstrapDto } from "./dto/super-admin-bootstrap.dto";
import { Prisma, SuperAdminUser } from "@prisma/master-client";

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private masterPrisma: MasterPrismaService,
    private jwtService: JwtService,
  ) {}

  async validateSuperAdmin(email: string, password: string): Promise<IBaseSuperAdmin> {
    const superAdmin = await this.masterPrisma.superAdminUser.findUnique({ where: { email } });

    if (!superAdmin) {
      throw new UnauthorizedException(`Invalid credentials`);
    }

    if (!superAdmin.isActive) {
      throw new UnauthorizedException(`Account is inactive`);
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(`Invalid credentials`);
    }

    /**
     * Update last login
     */
    const updated = await this.masterPrisma.superAdminUser.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    /**
     * Return only safe fields
     */
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async login(user: IBaseSuperAdmin): Promise<ResponseDto<ISuperAdminLoginResponse>> {
    const { email, id: userId, role } = user;

    const payload: IAuthSuperAdminAccessTokenPayload = {
      email,
      sub: userId,
      role,
      type: `SUPER_ADMIN`,
    };

    const access_token = this.generateAccessToken(payload);

    return {
      message: `Super Admin Logged-in Successfully.`,
      data: { access_token, user },
    };
  }

  /**
   * Generate Access Token
   */
  generateAccessToken(
    payload: IAuthSuperAdminAccessTokenPayload,
    expiresIn: string = process.env.JWT_EXPIRES_IN || "24h",
  ): string {
    return this.jwtService.sign(payload, {
      expiresIn,
      secret: process.env.JWT_SECRET,
    });
  }

  async refreshToken(user: IBaseSuperAdmin): Promise<ResponseDto<{ access_token: string }>> {
    const { email, id: userId, role } = user;

    const payload: IAuthSuperAdminAccessTokenPayload = {
      email,
      sub: userId,
      role,
      type: `SUPER_ADMIN`,
    };

    const access_token = this.generateAccessToken(payload);
    return {
      message: `Token refreshed successfully`,
      data: { access_token },
    };
  }

  async updatePassword(
    req: RequestWithSuperAdminUser,
    superAdminUpdatePasswordDto: SuperAdminUpdatePasswordDto,
  ): Promise<ResponseDto> {
    const { id: userId } = req.user;
    const { currentPassword, newPassword } = superAdminUpdatePasswordDto;

    const admin = await this.checkExistence(userId);

    const isValid = await bcrypt.compare(currentPassword, admin.password);

    if (!isValid) {
      throw new UnauthorizedException(`Current password is incorrect`);
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.masterPrisma.superAdminUser.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: `Password updated successfully` };
  }

  async getBootstrapStatus(): Promise<{ alreadyInitialized: boolean; bootstrapEnabled: boolean }> {
    const count = await this.masterPrisma.superAdminUser.count();
    const alreadyInitialized = count > 0;
    return {
      alreadyInitialized,
      bootstrapEnabled: !alreadyInitialized && Boolean(process.env.SUPER_ADMIN_BOOTSTRAP_KEY),
    };
  }

  async bootstrapFirstSuperAdmin(superAdminBootstrapDto: SuperAdminBootstrapDto): Promise<ResponseDto> {
    const expectedKey = process.env.SUPER_ADMIN_BOOTSTRAP_KEY;
    if (!expectedKey) {
      throw new ForbiddenException("First-time setup is disabled. Set SUPER_ADMIN_BOOTSTRAP_KEY on the backend.");
    }

    const { email, password, name, bootstrapKey } = superAdminBootstrapDto;
    if (bootstrapKey !== expectedKey) {
      throw new UnauthorizedException("Invalid bootstrap key");
    }

    const existingCount = await this.masterPrisma.superAdminUser.count();
    if (existingCount > 0) {
      throw new ConflictException("A super admin already exists. Use the login form.");
    }

    await this.masterPrisma.superAdminUser.create({
      data: {
        name: name?.trim() || "Super Admin",
        email,
        password: await bcrypt.hash(password, 10),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    return { message: "Super admin created. You can now sign in." };
  }

  async checkExistence(userId: string): Promise<SuperAdminUser> {
    const found = await this.masterPrisma.superAdminUser.findUnique({ where: { id: userId } });

    if (!found) {
      throw new NotFoundException(`Super Admin not found.`);
    }

    return found;
  }
}
