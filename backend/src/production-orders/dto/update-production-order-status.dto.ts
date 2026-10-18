import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsString,
} from "class-validator";

export enum ProductionOrderAction {
  CONFIRM = "CONFIRM",
  COMPLETE = "COMPLETE",
  CANCEL = "CANCEL",
}

export class UpdateProductionOrderStatusDto {
  @ApiProperty({
    enum: ProductionOrderAction,
    description:
      "CONFIRM: DRAFT → IN_PROGRESS (consumes reserved materials). " +
      "COMPLETE: IN_PROGRESS → COMPLETED (records produced quantity, creates product batch). " +
      "CANCEL: DRAFT or IN_PROGRESS → CANCELLED (releases/reverses material usage).",
  })
  @IsEnum(ProductionOrderAction)
  action: ProductionOrderAction;

  @ApiPropertyOptional({
    example: 98,
    description: "Actual quantity produced — required when action = COMPLETE",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  producedQuantity?: number;

  @ApiPropertyOptional({
    description:
      "Site where the produced batch is located — only used when action = COMPLETE. " +
      "Defaults to the order's site.",
  })
  @IsOptional()
  @IsString()
  siteId?: string;
}
