import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsEnum, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { SubscriptionType } from "@prisma/master-client";

export class TenantFiltersDto {
  @ApiProperty({ required: false, description: "Search by name or email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  isSuspended?: boolean;

  @ApiProperty({ enum: SubscriptionType, required: false })
  @IsOptional()
  @IsEnum(SubscriptionType)
  subscriptionType?: SubscriptionType;
}
