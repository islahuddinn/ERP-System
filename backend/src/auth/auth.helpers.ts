import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { IAccessTokenPayload } from "./utils/interfaces";

@Injectable()
export class AuthHelpers {
  private readonly logger = new Logger(AuthHelpers.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generate Access Token
   */
  generateAccessToken(
    payload: IAccessTokenPayload,
    expiresIn: string = process.env.JWT_EXPIRES_IN || "24h",
  ): string {
    return this.jwtService.sign(payload, {
      expiresIn,
      secret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
    });
  }

  /**
   * Generate Refresh Token
   */
  generateRefreshToken(payload: any, expiresIn: string = "7d"): string {
    return this.jwtService.sign(payload, {
      expiresIn,
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }

  /**
   * Verify Token
   */
  verifyToken(token: string, isRefresh = false): any {
    try {
      const secret = isRefresh
        ? process.env.JWT_REFRESH_SECRET
        : process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

      return this.jwtService.verify(token, { secret });
    } catch (error: any) {
      this.logger.error("Token verification failed", error.message);
      return null;
    }
  }

  /**
   * Decode Token (without verification)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) return null;

    const [type, token] = authHeader.split(" ");

    return type === "Bearer" ? token : null;
  }

  /**
   * Validate payload structure (optional safety layer)
   */
  validatePayload(payload: any): boolean {
    return !!payload && typeof payload === "object" && payload.sub;
  }
}
