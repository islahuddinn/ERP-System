import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
} from "class-validator";

export class CreateProductionOrderDto {
  // IDs in this system are not guaranteed to be canonical UUIDs (some records
  // carry 32-char hex IDs), so @IsUUID gave false "must be a UUID" rejections.
  // Validate as non-empty strings and rely on the FKs for existence.
  @ApiProperty({ example: "074e9b8c-3c9e-4999-8c41-88478351f4ca" })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: "287fab3e-f60a-4ca1-ae7b-2381f3e78ab9" })
  @IsString()
  @IsNotEmpty()
  bomId: string;

  @ApiPropertyOptional({ example: "ff8e7e2a-448a-4e6d-8915-0760cb8281c4" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  siteId?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  plannedQuantity: number;

  @ApiPropertyOptional({ example: "Production run for June batch" })
  @IsOptional()
  @IsString()
  notes?: string;
}
