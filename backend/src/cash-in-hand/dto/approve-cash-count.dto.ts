import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class ApproveCashCountDto {
  @ApiProperty({
    example: "Approved after verification",
    description: "Approval notes",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
