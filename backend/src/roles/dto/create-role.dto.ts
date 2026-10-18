import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateRoleDto {
  @ApiProperty({ description: "Role name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ description: "Role description" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ description: "Permission IDs to assign to this role", type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  permissionIds?: string[];
}
