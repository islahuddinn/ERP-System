import { BadRequestException } from "@nestjs/common";
import * as path from "path";

export const ALLOWED_MIME_TYPES = {
  csv: ["text/csv", "application/csv"],
  excel: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

export const ALLOWED_EXTENSIONS = {
  csv: [".csv"],
  excel: [".xlsx", ".xls"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
};

export const MAX_FILE_SIZE = {
  csv: 10 * 1024 * 1024, // 10MB
  excel: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB
};

export function validateFile(
  file: Express.Multer.File,
  allowedTypes: string[],
  maxSize: number,
): void {
  if (!file) {
    throw new BadRequestException("No file uploaded");
  }

  // Validate MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
    );
  }

  // Validate file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = getAllowedExtensions(allowedTypes);

  if (!allowedExts.includes(ext)) {
    throw new BadRequestException(
      `Invalid file extension. Allowed extensions: ${allowedExts.join(", ")}`,
    );
  }

  // Validate file size
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(2)}MB`,
    );
  }

  // Validate filename (prevent path traversal)
  if (
    file.originalname.includes("..") ||
    file.originalname.includes("/") ||
    file.originalname.includes("\\")
  ) {
    throw new BadRequestException("Invalid filename");
  }
}

function getAllowedExtensions(mimeTypes: string[]): string[] {
  const extensions = [];
  if (mimeTypes.some((mt) => ALLOWED_MIME_TYPES.csv.includes(mt))) {
    extensions.push(...ALLOWED_EXTENSIONS.csv);
  }
  if (mimeTypes.some((mt) => ALLOWED_MIME_TYPES.excel.includes(mt))) {
    extensions.push(...ALLOWED_EXTENSIONS.excel);
  }
  if (mimeTypes.some((mt) => ALLOWED_MIME_TYPES.image.includes(mt))) {
    extensions.push(...ALLOWED_EXTENSIONS.image);
  }
  return extensions;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .toLowerCase();
}
