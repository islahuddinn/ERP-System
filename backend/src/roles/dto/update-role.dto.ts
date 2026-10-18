import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: "Role name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({ description: "Role description" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;
}
