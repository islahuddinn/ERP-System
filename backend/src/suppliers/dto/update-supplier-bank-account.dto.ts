import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateSupplierBankAccountDto } from "./create-supplier-bank-account.dto";

// supplierId is intentionally never in the update DTO — ownership is enforced via the URL param
export class UpdateSupplierBankAccountDto extends PartialType(CreateSupplierBankAccountDto) {}
