import { PartialType } from "@nestjs/swagger";
import { CreateProductBonusSchemeDto } from "./create-product-bonus-scheme.dto";

export class UpdateProductBonusSchemeDto extends PartialType(CreateProductBonusSchemeDto) {}
