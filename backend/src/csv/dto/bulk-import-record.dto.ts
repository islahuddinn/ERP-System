import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
} from "class-validator";

export enum ImportStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export class BulkImportRecordDto {
  @ApiProperty({ example: "uuid" })
  @IsString()
  id: string;

  @ApiProperty({ example: "products-import-2024-01-15.xlsx" })
  @IsString()
  fileName: string;

  @ApiProperty({ example: "products-import-2024-01-15.xlsx" })
  @IsString()
  originalFileName: string;

  @ApiProperty({ enum: ImportStatus, example: ImportStatus.COMPLETED })
  @IsEnum(ImportStatus)
  status: ImportStatus;

  @ApiProperty({ example: 100 })
  @IsNumber()
  totalRecords: number;

  @ApiProperty({ example: 95 })
  @IsNumber()
  successfulRecords: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  failedRecords: number;

  @ApiProperty({
    example: ["Row 10: Invalid SKU format", "Row 25: Missing required field"],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];

  @ApiProperty({ example: "2024-01-15T10:30:00Z" })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ example: "2024-01-15T10:35:00Z", required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ example: "uuid" })
  @IsString()
  userId: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  userName: string;

  @ApiProperty({ example: "john@example.com" })
  @IsString()
  userEmail: string;

  @ApiProperty({
    example: {
      productsCreated: 80,
      productsUpdated: 15,
      categoriesCreated: 3,
      uomsCreated: 2,
    },
    required: false,
  })
  @IsOptional()
  summary?: {
    productsCreated: number;
    productsUpdated: number;
    categoriesCreated: number;
    uomsCreated: number;
  };
}
