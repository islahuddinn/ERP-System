import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../users/guards/permissions.guard';
import { RequirePermission } from '../../users/decorators/permissions.decorator';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';

@ApiTags('Journal Entries')
@Controller('financial/journal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @RequirePermission("finance.create_journal")
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createJournalDto: CreateJournalDto) {
    return this.journalService.create(createJournalDto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get all journal entries' })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.journalService.findAll();
  }

  @Get('posted')
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get posted journal entries' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Posted entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPostedEntries(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.journalService.getPostedEntries(start, end);
  }

  @Get(':id')
  @RequirePermission("finance.view")
  @ApiOperation({ summary: 'Get a journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.journalService.findOne(id);
  }

  @Post(':id/post')
  @RequirePermission("finance.approve_journal")
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - entry already posted or not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  post(@Param('id') id: string) {
    return this.journalService.post(id);
  }

  @Post(':id/reverse')
  @RequirePermission("finance.approve_journal")
  @ApiOperation({ summary: 'Reverse a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry reversed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - entry not posted or not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  reverse(@Param('id') id: string, @Body('reason') reason: string) {
    if (!reason) {
      throw new BadRequestException('Reversal reason is required');
    }
    return this.journalService.reverse(id, reason);
  }
}
