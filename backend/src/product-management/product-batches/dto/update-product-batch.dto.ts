import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ProductBatchStatus } from "@prisma/tenant-client";

export class UpdateProductBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: ProductBatchStatus,
    description: "Manually override status, e.g. BLOCKED (hold) or QUARANTINE",
  })
  @IsOptional()
  @IsEnum(ProductBatchStatus)
  status?: ProductBatchStatus;
}
