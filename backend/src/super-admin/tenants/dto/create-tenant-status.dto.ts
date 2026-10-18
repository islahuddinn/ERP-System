import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsNotEmpty } from "class-validator";
import { TenantStatus } from "@prisma/master-client";
import { Transform } from "class-transformer";

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: TenantStatus })
  @IsNotEmpty()
  @IsEnum(TenantStatus)
  status: TenantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    const v = value?.trim();
    return v ? v.toLowerCase() : null;
  })
  suspensionReason?: string;
}
