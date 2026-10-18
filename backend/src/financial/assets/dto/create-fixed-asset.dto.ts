import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateFixedAssetDto {
  @ApiProperty({ description: "Asset name" })
  @IsString()
  @IsNotEmpty()
  assetName: string;

  @ApiProperty({ description: "Asset cost" })
  @IsNumber()
  @Min(0.01)
  cost: number;

  @ApiProperty({
    description: "Useful life (stored as months)",
  })
  @IsNumber()
  @Min(1)
  usefulLife: number;

  @ApiProperty({ description: "Depreciation method (e.g. STRAIGHT_LINE)" })
  @IsString()
  @IsNotEmpty()
  depreciationMethod: string;

  @ApiProperty({
    description: "Purchase date (optional). Used as journal entry date.",
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchaseDate?: Date;

  @ApiProperty({
    description: "Optional Chart of Account ID to debit for Asset (ASSET). If missing, picks first ASSET account.",
    required: false,
  })
  @IsOptional()
  @IsString()
  assetAccountId?: string;

  @ApiProperty({
    description: "Optional Chart of Account ID to credit for Cash (ASSET). If missing, picks first ASSET account.",
    required: false,
  })
  @IsOptional()
  @IsString()
  cashAccountId?: string;
}

