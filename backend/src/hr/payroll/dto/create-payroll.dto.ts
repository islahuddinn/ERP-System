import { IsUUID, IsDateString, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePayrollDto {
  @ApiProperty({
    description: "Array of employee IDs",
    type: "array",
    items: { type: "string" },
  })
  @IsArray()
  @IsUUID("4", { each: true })
  employeeIds: string[];

  @ApiProperty({ description: "Payroll period start date (YYYY-MM-DD)" })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: "Payroll period end date (YYYY-MM-DD)" })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({
    description: "Month when payroll will be paid (YYYY-MM format)",
    example: "2026-07",
  })
  @IsDateString()
  paidMonth: string;
}
