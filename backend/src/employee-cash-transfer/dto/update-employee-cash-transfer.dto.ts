import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateEmployeeCashTransferDto } from "./create-employee-cash-transfer.dto";

// toEmployeeId and settlesTransferId are intentionally excluded — a transfer
// can never be reassigned to a different recipient or a different stock
// transfer once created, since both were already validated together at
// creation (see EmployeeCashTransferService.assertSettlesTransferDebt). Only
// amount/notes can change, and only while it is still PENDING.
export class UpdateEmployeeCashTransferDto extends PartialType(
  OmitType(CreateEmployeeCashTransferDto, ["toEmployeeId", "settlesTransferId"] as const),
) {}
