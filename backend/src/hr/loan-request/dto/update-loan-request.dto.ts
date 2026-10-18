import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateLoanRequestDto } from "./create-loan-request.dto";

// employeeId is intentionally excluded — a loan request can never be reassigned to a different employee.
export class UpdateLoanRequestDto extends PartialType(
  OmitType(CreateLoanRequestDto, ["employeeId"] as const),
) {}
