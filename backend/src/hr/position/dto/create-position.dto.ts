import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePositionDto {
  @ApiProperty({ description: "Position title" })
  @IsString({ message: "title must be a string" })
  @IsNotEmpty({ message: "title should not be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({ description: "Position description" })
  @IsOptional()
  @IsString({ message: "description must be a string" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;
}
