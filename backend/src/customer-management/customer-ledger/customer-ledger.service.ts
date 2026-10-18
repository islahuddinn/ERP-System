import { Injectable } from "@nestjs/common";
import { CustomersService } from "../customers/customers.service";
import { CustomerLedgerRepository } from "./customer-ledger.repository";
import { CustomerLedgerFiltersDto } from "./dto/customer-ledger-filters.dto";
import { CustomerLedgerResponse } from "./utils/types";

@Injectable()
export class CustomerLedgerService {
  constructor(
    private readonly customerLedgerRepository: CustomerLedgerRepository,
    private readonly customersService: CustomersService,
  ) {}

  async getCustomerLedger(
    customerId: string,
    customerLedgerFiltersDto: CustomerLedgerFiltersDto,
  ): Promise<CustomerLedgerResponse> {
    await this.customersService.checkExistence(customerId);

    const { startDate, endDate } = customerLedgerFiltersDto;

    const [customer, summary, ledger] = await Promise.all([
      this.customerLedgerRepository.findHeader(customerId),
      this.customerLedgerRepository.getSummary(customerId, startDate, endDate),
      this.customerLedgerRepository.findEntries(customerId, customerLedgerFiltersDto),
    ]);

    return { customer: customer!, summary, ledger };
  }

  async exportToCsv(
    customerId: string,
    customerLedgerFiltersDto: CustomerLedgerFiltersDto,
  ): Promise<string> {
    await this.customersService.checkExistence(customerId);

    const { startDate, endDate } = customerLedgerFiltersDto;
    const entries = await this.customerLedgerRepository.findAllForExport(
      customerId,
      startDate,
      endDate,
    );

    const headers = ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"];
    const rows = entries.map((entry) => [
      entry.date.toISOString().split("T")[0],
      entry.type,
      entry.reference ?? "",
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
    ]);

    return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");
  }
}
