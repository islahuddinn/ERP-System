import { IsString, IsArray, IsDecimal, IsNotEmpty, IsOptional, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class JournalLineDto {
  @ApiProperty({ description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ description: 'Debit amount' })
  @IsDecimal()
  @IsNotEmpty()
  debit: number;

  @ApiProperty({ description: 'Credit amount' })
  @IsDecimal()
  @IsNotEmpty()
  credit: number;

  @ApiProperty({ description: 'Line description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateJournalDto {
  @ApiProperty({ description: 'Entry date' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Source document type', required: false })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiProperty({ description: 'Source document id', required: false })
  @IsString()
  @IsOptional()
  sourceId?: string;

  @ApiProperty({ description: 'Idempotent posting kind', required: false })
  @IsString()
  @IsOptional()
  postingKind?: string;

  @ApiProperty({ description: 'Journal lines', type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
