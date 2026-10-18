import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";

export class TransferStockDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  fromWarehouseId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  fromZoneId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  toWarehouseId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  toZoneId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  productId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: "Transfer notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
