import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CustomerCategoryStatus } from "@prisma/tenant-client";

export class CreateCustomerCategoryDto {
  @ApiProperty({ description: "Customer category name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ enum: CustomerCategoryStatus, default: CustomerCategoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CustomerCategoryStatus)
  status?: CustomerCategoryStatus;
}
