import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: "Rent & Utilities" })
  @IsString()
  name: string;

  @ApiProperty({ example: "Office rent and utility bills", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "rent", required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: "#3B82F6", required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
