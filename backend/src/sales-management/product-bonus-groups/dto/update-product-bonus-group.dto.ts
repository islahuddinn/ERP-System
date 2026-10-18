import { PartialType } from "@nestjs/swagger";
import { CreateProductBonusGroupDto } from "./create-product-bonus-group.dto";

export class UpdateProductBonusGroupDto extends PartialType(CreateProductBonusGroupDto) {}
