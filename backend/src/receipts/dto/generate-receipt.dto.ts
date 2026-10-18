import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ReceiptFormat, ReceiptType } from "@prisma/tenant-client";

export class GenerateReceiptDto {
  @ApiProperty({
    example: "PDF",
    enum: ReceiptFormat,
    description: "Receipt format",
  })
  @IsEnum(ReceiptFormat)
  format: ReceiptFormat;

  @ApiProperty({
    example: "ORIGINAL",
    enum: ReceiptType,
    description: "Receipt type",
    required: false,
  })
  @IsOptional()
  @IsEnum(ReceiptType)
  receiptType?: ReceiptType;
}
