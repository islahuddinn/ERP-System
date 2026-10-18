import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
} from "class-validator";
import { WorkOrderStatus, ProductionPriority } from "@prisma/tenant-client";

export class CreateWorkOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workOrderNumber?: string;

  @ApiProperty()
  @IsString()
  productionOrderId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkOrderStatus, default: WorkOrderStatus.SCHEDULED })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;

  @ApiProperty({ enum: ProductionPriority, default: ProductionPriority.MEDIUM })
  @IsEnum(ProductionPriority)
  priority: ProductionPriority;

  @ApiProperty()
  @IsDateString()
  scheduledStartDate: string;

  @ApiProperty()
  @IsDateString()
  scheduledEndDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkOrderStatus, required: false })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiProperty({ enum: ProductionPriority, required: false })
  @IsOptional()
  @IsEnum(ProductionPriority)
  priority?: ProductionPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
