import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { TerritoryStatus, PriceListTier, BranchType } from "@prisma/tenant-client";

export class CreateBranchDto {
  @ApiProperty({
    enum: BranchType,
    description:
      "PRIMARY buys straight from the Factory and must not have a parentBranchId. SECONDARY buys from a Primary branch and must include one",
  })
  @IsEnum(BranchType)
  type: BranchType;

  @ApiProperty({ description: "Branch code" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => value?.trim())
  code: string;

  @ApiProperty({ description: "Branch name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "City this branch belongs to" })
  @IsUUID()
  cityId: string;

  @ApiProperty({ description: "Distributor (employee) responsible for this branch" })
  @IsUUID()
  distributorId: string;

  @ApiPropertyOptional({
    description:
      "Parent branch this branch requests stock from. Omit for a top-level branch, which requests straight from the Factory",
  })
  @IsOptional()
  @IsUUID()
  parentBranchId?: string;

  @ApiProperty({ description: "Branch address" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: "Product groups this branch stocks", type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique({ message: "Product groups must not be duplicated" })
  @IsUUID(undefined, { each: true })
  productGroupIds: string[];

  @ApiPropertyOptional({ enum: TerritoryStatus, default: TerritoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;

  @ApiPropertyOptional({
    enum: PriceListTier,
    description:
      "Which company-wide price list this branch buys at — only used while the company is in FIXED_PRICE mode",
  })
  @IsOptional()
  @IsEnum(PriceListTier)
  priceTier?: PriceListTier;
}
