import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: "Acme Corporation" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "admin@acme.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "123 Main St, City, Country" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "acme" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    const v = value?.trim();
    return v ? v.toLowerCase() : null;
  })
  subdomain?: string;

  @ApiPropertyOptional({ example: "Acme Retail" })
  @IsOptional()
  @IsString()
  brandingName?: string;
}
