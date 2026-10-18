import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateLoanRequestDto {
  @ApiProperty({ description: "Employee this loan request is for" })
  @IsUUID()
  employeeId: string;

  @ApiPropertyOptional({ description: "Reason for the loan request" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({ description: "Total loan amount requested", example: 10000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount: number;

  @ApiProperty({
    description: "Number of installments the loan will be split into and returned over",
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(60)
  totalInstallments: number;

  @ApiProperty({
    type: [String],
    description: "User ID(s) who must approve this loan request — at least one required",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  approverIds: string[];
}
