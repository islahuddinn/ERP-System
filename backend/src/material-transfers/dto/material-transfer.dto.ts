import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
} from "class-validator";

export enum MaterialTransferStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export enum MaterialTransferPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum MaterialTransferType {
  WAREHOUSE_TO_WAREHOUSE = "WAREHOUSE_TO_WAREHOUSE",
  WAREHOUSE_TO_PLANT = "WAREHOUSE_TO_PLANT",
  PLANT_TO_WAREHOUSE = "PLANT_TO_WAREHOUSE",
  PLANT_TO_PLANT = "PLANT_TO_PLANT",
  DEPARTMENT_TO_DEPARTMENT = "DEPARTMENT_TO_DEPARTMENT",
}

export enum TransferLocationType {
  WAREHOUSE = "WAREHOUSE",
  PLANT = "PLANT",
  DEPARTMENT = "DEPARTMENT",
}

export class CreateMaterialTransferDto {
  @ApiProperty({ example: "MT-2024-001", required: false })
  @IsOptional()
  @IsString()
  transferNumber?: string;

  @ApiProperty({
    example: "Transfer raw materials from warehouse to production line",
  })
  @IsString()
  title: string;

  @ApiProperty({ example: "Detailed description of material transfer" })
  @IsString()
  description: string;

  @ApiProperty({ enum: MaterialTransferType })
  @IsEnum(MaterialTransferType)
  transferType: MaterialTransferType;

  @ApiProperty({
    enum: MaterialTransferPriority,
    default: MaterialTransferPriority.MEDIUM,
  })
  @IsEnum(MaterialTransferPriority)
  priority: MaterialTransferPriority;

  @ApiProperty({ example: "2024-01-15T09:00:00Z" })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: "2024-01-16T17:00:00Z" })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  // Source Location
  @ApiProperty({ enum: TransferLocationType })
  @IsEnum(TransferLocationType)
  sourceLocationType: TransferLocationType;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  sourceLocationId: string;

  @ApiProperty({ example: "Zone A, Rack 1" })
  @IsOptional()
  @IsString()
  sourceLocationDetails?: string;

  // Destination Location
  @ApiProperty({ enum: TransferLocationType })
  @IsEnum(TransferLocationType)
  destinationLocationType: TransferLocationType;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  destinationLocationId: string;

  @ApiProperty({ example: "Production Line B, Station 3" })
  @IsOptional()
  @IsString()
  destinationLocationDetails?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  requestedById?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  approvedById?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  transporterId?: string;

  @ApiProperty({ example: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: [
      { materialId: "550e8400-e29b-41d4-a716-446655440000", quantity: 100 },
    ],
  })
  @IsArray()
  items: Array<{
    materialId: string;
    quantity: number;
    specifications?: string;
  }>;
}

export class UpdateMaterialTransferDto {
  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: "Updated detailed description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaterialTransferStatus })
  @IsOptional()
  @IsEnum(MaterialTransferStatus)
  status?: MaterialTransferStatus;

  @ApiProperty({ enum: MaterialTransferPriority })
  @IsOptional()
  @IsEnum(MaterialTransferPriority)
  priority?: MaterialTransferPriority;

  @ApiProperty({ example: "2024-01-16T09:00:00Z" })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ example: "2024-01-17T17:00:00Z" })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiProperty({ example: "Updated notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  approvedById?: string;

  @ApiProperty({ example: "Approval comments" })
  @IsOptional()
  @IsString()
  approvalComments?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  transporterId?: string;

  @ApiProperty({ example: "Transport details" })
  @IsOptional()
  @IsString()
  transportDetails?: string;
}

export class MaterialTransferQueryDto {
  @ApiProperty({ example: "PENDING", required: false })
  @IsOptional()
  @IsEnum(MaterialTransferStatus)
  status?: MaterialTransferStatus;

  @ApiProperty({ example: "WAREHOUSE_TO_PLANT", required: false })
  @IsOptional()
  @IsEnum(MaterialTransferType)
  transferType?: MaterialTransferType;

  @ApiProperty({ example: "WAREHOUSE", required: false })
  @IsOptional()
  @IsEnum(TransferLocationType)
  sourceLocationType?: TransferLocationType;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceLocationId?: string;

  @ApiProperty({ example: "PLANT", required: false })
  @IsOptional()
  @IsEnum(TransferLocationType)
  destinationLocationType?: TransferLocationType;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  destinationLocationId?: string;

  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2024-12-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: "1", required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ example: "10", required: false })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class CreateMaterialTransferItemDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  materialId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: "Specific requirements" })
  @IsOptional()
  @IsString()
  specifications?: string;
}

export class UpdateMaterialTransferItemDto {
  @ApiProperty({ example: 95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @ApiProperty({ example: "5" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @ApiProperty({ example: "Updated specifications" })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiProperty({ example: "Receiving notes" })
  @IsOptional()
  @IsString()
  receivingNotes?: string;
}
