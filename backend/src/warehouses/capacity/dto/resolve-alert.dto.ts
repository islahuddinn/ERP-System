import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ResolveAlertDto {
  @ApiProperty({
    description: "Optional reason for resolving the alert",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
