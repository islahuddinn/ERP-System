import { IsEnum, IsOptional, IsString } from "class-validator";
import { SubscriptionStatus } from "@prisma/master-client";

export class UpdateSubscriptionStatusDto {
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
