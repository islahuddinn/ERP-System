import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ description: 'Vendor name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Vendor email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Vendor phone', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Vendor address', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}
