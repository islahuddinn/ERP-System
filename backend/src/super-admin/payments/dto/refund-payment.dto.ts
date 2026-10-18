import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefundPaymentDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;
}
