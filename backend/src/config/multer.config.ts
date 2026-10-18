import { BadRequestException } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import {
  sanitizeFilename,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../common/utils/file-validation.util";

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = join(process.cwd(), "temp");

      // Create temp directory if it doesn't exist
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const safeName = sanitizeFilename(file.fieldname);
      const filename = `${safeName}-${uniqueSuffix}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      ...ALLOWED_MIME_TYPES.csv,
      ...ALLOWED_MIME_TYPES.excel,
    ];

    // Validate MIME type
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new BadRequestException("Only CSV and Excel files are allowed"),
        false,
      );
    }

    // Validate extension
    const ext = extname(file.originalname).toLowerCase();
    const allowedExts = [".csv", ".xlsx", ".xls"];
    if (!allowedExts.includes(ext)) {
      return cb(new BadRequestException("Invalid file extension"), false);
    }

    // Validate filename
    if (file.originalname.includes("..") || file.originalname.includes("/")) {
      return cb(new BadRequestException("Invalid filename"), false);
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE.excel,
    files: 1, // Only one file at a time
  },
};
