import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../users/guards/permissions.guard';
import { RequirePermission } from '../../users/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Financial Reports')
@Controller(['financial/reports', 'reports'])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("finance.view_reports")
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Trial balance generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTrialBalance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getTrialBalance(start, end);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Get income statement report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Income statement generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getIncomeStatement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getIncomeStatement(start, end);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Profit and loss generated successfully' })
  getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getIncomeStatement(start, end);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get balance sheet report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Balance sheet generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBalanceSheet(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getBalanceSheet(start, end);
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'Get general ledger report' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by specific account' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'General ledger generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getGeneralLedger(
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getGeneralLedger(accountId, start, end);
  }

  @Get('general-ledger/:accountId')
  @ApiOperation({ summary: 'Get general ledger for specific account' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Account general ledger generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAccountLedger(
    @Param("accountId", ParseUUIDPipe) accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getGeneralLedger(accountId, start, end);
  }

  @Get("cash-flow")
  @ApiOperation({ summary: "Get cash flow report (bank transactions plus GL cash account)" })
  @ApiQuery({ name: "startDate", required: false, description: "Start date filter" })
  @ApiQuery({ name: "endDate", required: false, description: "End date filter" })
  @ApiResponse({ status: 200, description: "Cash flow generated successfully" })
  getCashFlow(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getCashFlow(start, end);
  }

  @Get("reconciliation")
  @ApiOperation({ summary: "Reconcile operational ledgers against posted journals" })
  @ApiQuery({ name: "startDate", required: false, description: "Start date filter" })
  @ApiQuery({ name: "endDate", required: false, description: "End date filter" })
  @ApiResponse({ status: 200, description: "Reconciliation generated successfully" })
  getReconciliation(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getReconciliation(start, end);
  }

  @Get("posting-exceptions")
  @ApiOperation({ summary: "List operational movements that do not post a journal" })
  @ApiResponse({ status: 200, description: "Exception list returned" })
  getPostingExceptions() {
    return this.reportsService.listPostingExceptions();
  }
}
