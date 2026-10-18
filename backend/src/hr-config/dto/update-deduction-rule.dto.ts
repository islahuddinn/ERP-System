import { PartialType } from "@nestjs/swagger";
import { CreateDeductionRuleDto } from "./create-deduction-rule.dto";

export class UpdateDeductionRuleDto extends PartialType(CreateDeductionRuleDto) {}

