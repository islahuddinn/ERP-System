import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  ValidateIf,
} from "class-validator";
import { WasteType, WasteStatus } from "@prisma/tenant-client";

export class UpdateWasteManagementDto {
  @ApiPropertyOptional({ enum: WasteType })
  @IsOptional()
  @IsEnum(WasteType)
  wasteType?: WasteType;

  @ApiPropertyOptional({
    enum: WasteStatus,
    description: "Final disposition of the waste record (DISPOSED, RECYCLED or REUSED)",
  })
  @IsOptional()
  @IsEnum(WasteStatus)
  status?: WasteStatus;

  @ApiPropertyOptional({ description: "Why the item was wasted. Cannot be blank when provided." })
  @IsOptional()
  @ValidateIf((dto: UpdateWasteManagementDto) => dto.reason !== undefined)
  @IsString()
  @IsNotEmpty({ message: "reason must not be empty" })
  reason?: string;

  @ApiPropertyOptional({ description: "Optional notes. Send an empty string to clear." })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;
}
