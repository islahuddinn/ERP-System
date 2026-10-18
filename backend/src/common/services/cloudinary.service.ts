import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string | undefined;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");
    this.folder = this.configService.get<string>("CLOUDINARY_BRANDING_FOLDER") || "tenant-branding";

    this.enabled = Boolean(cloudName && apiKey && apiSecret);

    if (!this.enabled) {
      this.logger.warn(
        "Cloudinary credentials are missing. Branding uploads will fail until CLOUDINARY_* env vars are configured.",
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadLogo(file: Express.Multer.File, tenantId: string): Promise<UploadResult> {
    if (!file) {
      throw new Error("No file provided for upload");
    }

    if (!this.enabled) {
      throw new Error("Cloudinary is not configured. Set CLOUDINARY_* environment variables.");
    }

    const folder = this.folder ? `${this.folder}/${tenantId}` : `tenant-branding/${tenantId}`;

    const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `logo_${Date.now()}`,
          resource_type: "image",
          overwrite: true,
          transformation: [
            {
              width: 512,
              height: 512,
              crop: "limit",
              fetch_format: "auto",
              quality: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error("Unknown Cloudinary upload error"));
          }
        },
      );

      uploadStream.end(file.buffer);
    }).catch((error) => {
      this.logger.error(`Failed to upload logo to Cloudinary: ${error.message}`);
      throw new Error("Failed to upload logo. Please try again.");
    });

    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    };
  }

  async deleteLogo(publicId?: string): Promise<void> {
    if (!publicId || !this.enabled) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${error.message}`);
    }
  }
}
