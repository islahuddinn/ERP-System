import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { BOMStatus } from "@prisma/tenant-client";
import { CreateBomItemDto } from "./create-bom.dto";

export class UpdateBomStatusDto {
  @ApiProperty({ enum: BOMStatus, description: "Target status (ACTIVE or INACTIVE)" })
  @IsEnum(BOMStatus)
  status: BOMStatus;
}

export class UpdateBomDto {
  @ApiPropertyOptional({ description: "Updated BOM name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Updated description (send null to clear)" })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: [CreateBomItemDto],
    description: "Replaces all existing items — provide the full desired item list",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBomItemDto)
  items?: CreateBomItemDto[];
}
