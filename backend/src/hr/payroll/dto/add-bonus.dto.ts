import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddBonusDto {
  @ApiProperty({ description: "Bonus amount to add on top of the base salary", example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  bonusAmount: number;

  @ApiPropertyOptional({ description: "Reason for the bonus", example: "Q2 performance bonus" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bonusReason?: string;
}
