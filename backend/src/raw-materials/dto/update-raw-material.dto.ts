import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";
import { CreateRawMaterialDto } from "./create-raw-material.dto";

export class UpdateRawMaterialDto extends PartialType(CreateRawMaterialDto) {
  @ApiPropertyOptional({
    example: 150.0,
    description:
      "Last purchase price per UOM unit. Send null to clear it (stored as 0).",
    nullable: true,
  })
  @IsOptional()
  // Allow an explicit null (cleared price) to pass validation — #7. The service
  // coerces null to 0 before persisting since the column is a non-nullable Decimal.
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lastPurchasePrice?: number | null;
}
