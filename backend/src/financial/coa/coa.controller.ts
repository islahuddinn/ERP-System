import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../users/guards/permissions.guard';
import { RequirePermission } from '../../users/decorators/permissions.decorator';
import { CoaService } from './coa.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Chart of Accounts')
@Controller('financial/coa')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CoaController {
  constructor(private readonly coaService: CoaService) {}

  @Post()
  @RequirePermission("finance.manage_accounts")
  @ApiOperation({ summary: 'Create a new chart of account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.coaService.create(createAccountDto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get all chart of accounts' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.coaService.findAll();
  }

  @Get('refresh')
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get all chart of accounts (no cache)' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async findAllNoCache() {
    const accounts = await this.coaService.findAll();
    return {
      success: true,
      data: accounts,
      message: 'Accounts retrieved successfully'
    };
  }

  @Get('hierarchy')
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get chart of accounts hierarchy' })
  @ApiResponse({ status: 200, description: 'Hierarchy retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getHierarchy() {
    return this.coaService.getHierarchy();
  }

  @Get(':id')
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get a chart of account by ID' })
  @ApiResponse({ status: 200, description: 'Account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.coaService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission("finance.manage_accounts")
  @ApiOperation({ summary: 'Update a chart of account' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.coaService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @RequirePermission("finance.manage_accounts")
  @ApiOperation({ summary: 'Delete a chart of account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.coaService.remove(id);
  }
}
