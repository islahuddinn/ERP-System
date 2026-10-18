import { Injectable } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { BranchStockRepository } from "./branch-stock.repository";
import { BranchStockFiltersDto } from "./dto/branch-stock-filters.dto";
import { BranchStockBalanceDetail } from "./utils/types";

@Injectable()
export class BranchStockService {
  constructor(private readonly branchStockRepository: BranchStockRepository) {}

  async listBranchStock(
    branchStockFiltersDto: BranchStockFiltersDto,
  ): Promise<PaginatedResponse<BranchStockBalanceDetail>> {
    return this.branchStockRepository.findAll(branchStockFiltersDto);
  }
}
