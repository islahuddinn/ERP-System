import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * Encrypts and decrypts tenant user passwords for super-admin visibility.
 * Uses AES-256-GCM with a dedicated encryption key.
 */
@Injectable()
export class PasswordEncryptionService {
  private readonly logger = new Logger(PasswordEncryptionService.name);

  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 12; // Recommended IV size for GCM
  private readonly tagLength = 16;

  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>("PASSWORD_ENCRYPTION_KEY") ??
      this.configService.get<string>("ENCRYPTION_KEY");

    if (!rawKey) {
      this.logger.warn(
        "PASSWORD_ENCRYPTION_KEY not set. Falling back to ENCRYPTION_KEY. " +
          "Set PASSWORD_ENCRYPTION_KEY for better separation of concerns.",
      );
    }

    const keySource = rawKey ?? crypto.randomBytes(this.keyLength).toString("hex");
    this.key = crypto.createHash("sha256").update(keySource).digest().subarray(0, this.keyLength);
  }

  encrypt(plainText: string): string {
    if (!plainText) {
      return plainText;
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  decrypt(cipherText: string): string {
    if (!cipherText) {
      return cipherText;
    }

    try {
      const buffer = Buffer.from(cipherText, "base64");
      const iv = buffer.slice(0, this.ivLength);
      const authTag = buffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = buffer.slice(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString("utf8");
    } catch (error) {
      this.logger.error(`Failed to decrypt password: ${error.message}`);
      throw new Error("Failed to decrypt password");
    }
  }
}
