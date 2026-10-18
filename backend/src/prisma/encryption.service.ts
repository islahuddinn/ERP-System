import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * Service for encrypting and decrypting sensitive data (e.g., database connection strings)
 * Uses AES-256-GCM encryption for security
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly tagPosition = this.saltLength + this.ivLength;
  private readonly encryptedPosition = this.tagPosition + this.tagLength;

  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    // Get encryption key from environment or generate a default one (for development only)
    const key = this.configService.get<string>("ENCRYPTION_KEY") || this.generateDefaultKey();

    if (!this.configService.get<string>("ENCRYPTION_KEY")) {
      this.logger.warn(
        "⚠️  ENCRYPTION_KEY not set in environment. Using default key for development. " +
          "Set a strong encryption key in production!",
      );
    }

    // Derive a 32-byte key using PBKDF2
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt", // Salt for key derivation
      100000, // Iterations
      this.keyLength,
      "sha512",
    );
  }

  /**
   * Encrypts a string value
   * @param plaintext - The string to encrypt
   * @returns Encrypted string (base64 encoded)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, "utf8", "base64");
      encrypted += cipher.final("base64");

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "base64")]);

      // Return base64 encoded combined data
      return combined.toString("base64");
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypts an encrypted string
   * @param ciphertext - The encrypted string (base64 encoded)
   * @returns Decrypted string
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return ciphertext;
    }

    // Check if it's already a plaintext connection string (starts with postgresql://, mysql://, etc.)
    if (
      ciphertext.startsWith("postgresql://") ||
      ciphertext.startsWith("postgres://") ||
      ciphertext.startsWith("mysql://") ||
      ciphertext.startsWith("mongodb://")
    ) {
      this.logger.debug("Database URL appears to be plaintext, skipping decryption");
      return ciphertext;
    }

    try {
      // Decode base64
      const combined = Buffer.from(ciphertext, "base64");

      // Check if buffer is large enough to contain encrypted data
      if (combined.length < this.encryptedPosition) {
        this.logger.warn("Encrypted data too short, treating as plaintext");
        return ciphertext;
      }

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      this.logger.warn(`Decryption failed: ${error.message}, treating as plaintext`);
      // If decryption fails, assume it might be plaintext (for backward compatibility)
      return ciphertext;
    }
  }

  /**
   * Generates a default encryption key (for development only)
   * @private
   */
  private generateDefaultKey(): string {
    // Generate a random key for development
    // In production, this should be set via environment variable
    return crypto.randomBytes(32).toString("hex");
  }
}
