import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum MaterialRequestStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED",
}

export enum MaterialRequestPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum MaterialRequestType {
  PRODUCTION = "PRODUCTION",
  MAINTENANCE = "MAINTENANCE",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  RESEARCH = "RESEARCH",
  GENERAL = "GENERAL",
}

export class CreateMaterialRequestDto {
  @ApiProperty({ example: "MR-2024-001" })
  @IsString()
  requestNumber: string;

  @ApiProperty({ example: "Request for raw materials for production line A" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Detailed description of material requirements" })
  @IsString()
  description: string;

  @ApiProperty({ enum: MaterialRequestType })
  @IsEnum(MaterialRequestType)
  requestType: MaterialRequestType;

  @ApiProperty({
    enum: MaterialRequestPriority,
    default: MaterialRequestPriority.MEDIUM,
  })
  @IsEnum(MaterialRequestPriority)
  priority: MaterialRequestPriority;

  @ApiProperty({ example: "2024-01-15T09:00:00Z" })
  @IsDateString()
  requiredDate: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description:
      "STORAGE warehouse ID - Material requests can ONLY fetch from STORAGE warehouses",
    required: false,
  })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  productionOrderId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  requestedById?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  approvedById?: string;

  @ApiProperty({ example: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(MaterialRequestStatus)
  status?: MaterialRequestStatus;

  @ApiProperty({
    example: [
      {
        materialId: "550e8400-e29b-41d4-a716-446655440000",
        requestedQuantity: 100,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one material item is required" })
  @ValidateNested({ each: true })
  @Type(() => MaterialRequestItemDto)
  materials: MaterialRequestItemDto[];
}

class MaterialRequestItemDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  materialId: string;

  @ApiProperty({ example: 100 })
  @IsNumber({}, { message: "Requested quantity must be a number" })
  @Min(1, { message: "Requested quantity must be greater than 0" })
  requestedQuantity: number;
}

export class UpdateMaterialRequestDto {
  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: "Updated detailed description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaterialRequestStatus })
  @IsOptional()
  @IsEnum(MaterialRequestStatus)
  status?: MaterialRequestStatus;

  @ApiProperty({ enum: MaterialRequestPriority })
  @IsOptional()
  @IsEnum(MaterialRequestPriority)
  priority?: MaterialRequestPriority;

  @ApiProperty({ example: "2024-01-16T09:00:00Z" })
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

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
}

export class MaterialRequestQueryDto {
  @ApiProperty({ example: "PENDING", required: false })
  @IsOptional()
  @IsEnum(MaterialRequestStatus)
  status?: MaterialRequestStatus;

  @ApiProperty({ example: "PRODUCTION", required: false })
  @IsOptional()
  @IsEnum(MaterialRequestType)
  requestType?: MaterialRequestType;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  requestedById?: string;

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

export class CreateMaterialRequestItemDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  materialId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  requestedQuantity: number;

  @ApiProperty({ example: "Specific requirements" })
  @IsOptional()
  @IsString()
  specifications?: string;
}

export class UpdateMaterialRequestItemDto {
  @ApiProperty({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedQuantity?: number;

  @ApiProperty({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fulfilledQuantity?: number;

  @ApiProperty({ example: "Updated specifications" })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiProperty({ example: "Fulfillment notes" })
  @IsOptional()
  @IsString()
  fulfillmentNotes?: string;
}

// DTO for warehouse products with available quantity
export class WarehouseProductDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "Product A" })
  name: string;

  @ApiProperty({ example: "PROD-001" })
  code: string;

  @ApiProperty({ example: 50, description: "Available quantity in warehouse" })
  availableQuantity: number;

  @ApiProperty({ example: "UNIT" })
  unit: string;

  @ApiProperty({ example: "Raw Material" })
  category?: string;
}

export class GetWarehouseProductsResponseDto {
  @ApiProperty({ type: [WarehouseProductDto] })
  data: WarehouseProductDto[];

  @ApiProperty({ example: 5 })
  count: number;
}
