import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateBudgetLineDto {
  @ApiProperty({ description: "Chart of account ID" })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ description: "Period (month) 1..12" })
  @IsInt()
  @Min(1)
  period: number;

  @ApiProperty({ description: "Budgeted amount (positive)" })
  @IsNumber()
  @Min(0)
  budgetedAmount: number;
}

export class CreateBudgetDto {
  @ApiProperty({ description: "Fiscal year (e.g. 2026)" })
  @IsInt()
  @Min(1900)
  fiscalYear: number;

  @ApiProperty({ description: "Total budget amount" })
  @IsNumber()
  @Min(0)
  totalBudget: number;

  @ApiProperty({
    description: "Budget lines (accountId + period + budgetedAmount)",
    type: [CreateBudgetLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines: CreateBudgetLineDto[];
}

