import { ApiProperty } from "@nestjs/swagger";

export class CustomerStatsDto {
  @ApiProperty({ example: 15 })
  totalSales: number;

  @ApiProperty({ example: 1250.5 })
  totalAmount: number;

  @ApiProperty({ example: 1100.0 })
  totalPaid: number;

  @ApiProperty({ example: 150.5 })
  outstandingBalance: number;

  @ApiProperty({ example: 83.37 })
  averageSaleValue: number;

  @ApiProperty({ example: "2024-01-15T10:30:00Z" })
  lastSaleDate: Date | null;

  @ApiProperty({ example: 5 })
  salesThisMonth: number;

  @ApiProperty({ example: 250.75 })
  amountThisMonth: number;
}
