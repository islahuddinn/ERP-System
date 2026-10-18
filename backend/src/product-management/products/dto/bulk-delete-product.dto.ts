import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class BulkDeleteProductDto {
  @ApiProperty({
    type: [String],
    description: "Array of product IDs to delete",
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
