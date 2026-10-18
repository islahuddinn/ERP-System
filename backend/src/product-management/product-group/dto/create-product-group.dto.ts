import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ProductGroupStatus } from "@prisma/tenant-client";

export class CreateProductGroupDto {
  @ApiProperty({ description: "Product group name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ enum: ProductGroupStatus, default: ProductGroupStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductGroupStatus)
  status?: ProductGroupStatus;
}
