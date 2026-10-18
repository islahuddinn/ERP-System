import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ProductAdjustmentType } from "@prisma/tenant-client";

export class CreateProductAdjustmentDto {
  @ApiProperty({ description: "Shop receiving the product adjustment" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: "Product being adjusted" })
  @IsUUID()
  productId: string;

  @ApiProperty({
    enum: ProductAdjustmentType,
    description: "ADDITION records extra product qty; DEDUCTION records a qty reduction",
  })
  @IsEnum(ProductAdjustmentType)
  type: ProductAdjustmentType;

  @ApiProperty({ example: 5, description: "Positive quantity — direction comes from type" })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: "Damaged units removed after delivery" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  notes?: string;
}
