import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateDispatchOfficerDto {
  @ApiPropertyOptional({ description: "User ID of the person physically handling the dispatch" })
  @IsOptional()
  @IsString()
  dispatchOfficerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
