import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsObject } from "class-validator";
import { ImportStatus } from "./bulk-import-record.dto";

export class CreateBulkImportRecordDto {
  @ApiProperty({ example: "products-import-2024-01-15.xlsx" })
  @IsString()
  fileName: string;

  @ApiProperty({ example: "products-import-2024-01-15.xlsx" })
  @IsString()
  originalFileName: string;

  @ApiProperty({ enum: ImportStatus, example: ImportStatus.PENDING })
  @IsEnum(ImportStatus)
  status: ImportStatus;

  @ApiProperty({ example: 100 })
  @IsNumber()
  totalRecords: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  successfulRecords: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  failedRecords: number;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];

  @ApiProperty({ example: "uuid" })
  @IsString()
  userId: string;

  @ApiProperty({
    example: {
      productsCreated: 0,
      productsUpdated: 0,
      categoriesCreated: 0,
      uomsCreated: 0,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  summary?: {
    productsCreated: number;
    productsUpdated: number;
    categoriesCreated: number;
    uomsCreated: number;
  };
}
