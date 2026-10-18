import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ProductBrandStatus } from "@prisma/tenant-client";

export class CreateProductBrandDto {
  @ApiProperty({ description: "Product brand name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ enum: ProductBrandStatus, default: ProductBrandStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductBrandStatus)
  status?: ProductBrandStatus;
}
