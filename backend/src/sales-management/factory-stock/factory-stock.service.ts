import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { AuditContextService } from "../../audit/audit-context.service";
import { FactoryStockRepository } from "./factory-stock.repository";
import { FactoryStockFiltersDto } from "./dto/factory-stock-filters.dto";
import { StockInFactoryStockDto } from "./dto/stock-in-factory-stock.dto";
import { AdjustFactoryStockDto } from "./dto/adjust-factory-stock.dto";
import { FactoryStockBalanceDetail } from "./utils/types";

@Injectable()
export class FactoryStockService {
  constructor(
    private readonly factoryStockRepository: FactoryStockRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listFactoryStock(
    factoryStockFiltersDto: FactoryStockFiltersDto,
  ): Promise<PaginatedResponse<FactoryStockBalanceDetail>> {
    return this.factoryStockRepository.findAll(factoryStockFiltersDto);
  }

  // Always an upsert — the product may be entering factory stock for the
  // first time, so there's no existing balance to check against.
  async stockIn(
    stockInFactoryStockDto: StockInFactoryStockDto,
  ): Promise<FactoryStockBalanceDetail> {
    const { productId, quantity } = stockInFactoryStockDto;
    return this.factoryStockRepository.stockIn(productId, quantity);
  }

  // Unlike stock-in, a correction can only apply to a balance that's already
  // being tracked — you can't correct stock that was never recorded.
  async adjust(adjustFactoryStockDto: AdjustFactoryStockDto): Promise<FactoryStockBalanceDetail> {
    const { productId, delta, reason } = adjustFactoryStockDto;
    const existing = await this.checkExistence(productId);

    // This route carries the balance id in the body, not a route param, so
    // the audit interceptor can't infer entityId on its own for this UPDATE.
    this.auditContext.setEntityId(existing.id);
    this.auditContext.setOldValue(existing);
    this.auditContext.setMetadata({ reason });

    return this.factoryStockRepository.adjust(productId, delta);
  }

  async checkExistence(productId: string): Promise<FactoryStockBalanceDetail> {
    const balance = await this.factoryStockRepository.findByProductId(productId);

    if (!balance) {
      throw new NotFoundException("No factory stock balance exists yet for this product");
    }

    return balance;
  }
}
