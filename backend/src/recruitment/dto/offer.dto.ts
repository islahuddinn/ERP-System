import { ApiProperty } from "@nestjs/swagger";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  IsString,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { OfferStatus } from "./recruitment.enums";

export class CreateOfferDto {
  @ApiProperty({ description: "Application ID" })
  @IsString()
  applicationId: string;

  @ApiProperty({ description: "Offered salary" })
  @IsNumber()
  @Type(() => Number)
  offeredSalary: number;

  @ApiProperty({ description: "Joining date" })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  joiningDate: Date;
}

export class UpdateOfferDto {
  @ApiProperty({ description: "Offered salary" })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  offeredSalary?: number;

  @ApiProperty({ description: "Joining date" })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  joiningDate?: Date;

  @ApiProperty({ enum: OfferStatus, description: "Offer status" })
  @IsEnum(OfferStatus)
  @IsOptional()
  status?: OfferStatus;
}

export class ListOffersDto {
  @ApiProperty({ description: "Filter by application ID" })
  @IsString()
  @IsOptional()
  applicationId?: string;

  @ApiProperty({ enum: OfferStatus, description: "Filter by status" })
  @IsEnum(OfferStatus)
  @IsOptional()
  status?: OfferStatus;

  @ApiProperty({ description: "Page number", default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: "Page size", default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
