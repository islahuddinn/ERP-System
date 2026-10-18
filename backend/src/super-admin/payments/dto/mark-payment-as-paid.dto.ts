import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class MarkPaymentAsPaidDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;
}
