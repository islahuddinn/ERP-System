import { PartialType } from "@nestjs/swagger";
import { CreateCustomerBankAccountDto } from "./create-customer-bank-account.dto";

// customerId is intentionally never in the update DTO — ownership is enforced via the URL param
export class UpdateCustomerBankAccountDto extends PartialType(CreateCustomerBankAccountDto) {}
