import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CancelPaymentDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;
}
