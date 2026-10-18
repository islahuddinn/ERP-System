import { PartialType } from "@nestjs/swagger";
import { CreateCustomerCategoryDto } from "./create-customer-category.dto";

export class UpdateCustomerCategoryDto extends PartialType(CreateCustomerCategoryDto) {}
