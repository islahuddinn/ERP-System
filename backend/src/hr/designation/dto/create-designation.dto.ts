import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateDesignationDto {
  @ApiProperty({ description: "Designation title" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({ description: "Designation description" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ description: "Parent designation ID (for hierarchy)" })
  @IsOptional()
  @IsUUID()
  // "" from a cleared select is treated as "not provided"; null stays null (disconnects parent on update)
  @Transform(({ value }) => (value === "" ? undefined : value))
  parentDesignationId?: string | null;
}
