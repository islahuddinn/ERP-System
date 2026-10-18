import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({ description: "Department name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Department description", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  // "value?.trim()" would silently turn an explicit null into undefined (optional
  // chaining short-circuits on null), so the service's "!== undefined" check would
  // never see the clear and the old description would persist (#3). Only trim
  // actual strings; let null pass through unchanged.
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string | null;

  @ApiPropertyOptional({ description: "Parent department ID (for hierarchy)" })
  @IsOptional()
  @IsUUID()
  // "" from a cleared select is treated as "not provided"; null stays null (disconnects parent on update)
  @Transform(({ value }) => (value === "" ? undefined : value))
  parentDepartmentId?: string | null;
}
