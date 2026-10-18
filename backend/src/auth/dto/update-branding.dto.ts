import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    description: "Display name that appears in the tenant UI",
    example: "Acme Retail",
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brandingName?: string;

  @ApiPropertyOptional({
    description: "Set to true to delete/reset the logo to default",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  @IsBoolean()
  deleteLogo?: boolean;
}
