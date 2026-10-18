import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class StartProductBatchStageDto {
  @ApiProperty({
    example: "Packing",
    description: "Name of the stage/process this batch is now entering",
  })
  @IsString()
  @MinLength(2)
  stageName: string;

  @ApiPropertyOptional({ description: "Site where this stage is performed" })
  @IsOptional()
  // Site IDs are not guaranteed to be canonical UUIDs, so @IsUUID rejected valid
  // sites with "siteId must be a UUID". Validate as a non-empty string.
  @IsString()
  @IsNotEmpty()
  siteId?: string;
}
