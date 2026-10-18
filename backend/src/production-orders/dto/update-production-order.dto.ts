import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsNotEmpty,
} from "class-validator";

export class UpdateProductionOrderDto {
  @ApiPropertyOptional({ example: "uuid-of-site" })
  @IsOptional()
  // Site IDs are not guaranteed to be canonical UUIDs (some sites carry 32-char
  // hex IDs), so @IsUUID rejected valid references with "siteId must be a UUID".
  // Validate as a non-empty string and rely on the FK for existence.
  @IsString()
  @IsNotEmpty()
  siteId?: string;

  @ApiPropertyOptional({ example: "Updated notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
