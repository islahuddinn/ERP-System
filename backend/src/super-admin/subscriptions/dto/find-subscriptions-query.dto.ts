import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { SubscriptionStatus } from "@prisma/master-client/client";

export class SubscriptionsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
