import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsUUID } from "class-validator";
import { LoginAccess } from "@prisma/tenant-client";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by role ID" })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ enum: LoginAccess })
  @IsOptional()
  @IsEnum(LoginAccess)
  loginAccess?: LoginAccess;
}
