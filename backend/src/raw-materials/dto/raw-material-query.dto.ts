import {
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class RawMaterialQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  uomId?: string;
}
