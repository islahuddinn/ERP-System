import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ProductCategoryStatus } from "@prisma/tenant-client";

export class CreateProductCategoryDto {
  @ApiProperty({ description: "Product category name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ enum: ProductCategoryStatus, default: ProductCategoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductCategoryStatus)
  status?: ProductCategoryStatus;
}
