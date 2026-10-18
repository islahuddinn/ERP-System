import { PartialType } from "@nestjs/swagger";
import { CreateSupplierTransactionDto } from "./create-supplier-transaction.dto";

export class UpdateSupplierTransactionDto extends PartialType(
  CreateSupplierTransactionDto,
) {}
