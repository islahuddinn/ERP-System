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
import { Transform } from "class-transformer";

export enum MachineStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
  UNDER_REPAIR = "UNDER_REPAIR",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
  DECOMMISSIONED = "DECOMMISSIONED",
}

export enum MachineType {
  PRODUCTION = "PRODUCTION",
  ASSEMBLY = "ASSEMBLY",
  PACKAGING = "PACKAGING",
  TESTING = "TESTING",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  MATERIAL_HANDLING = "MATERIAL_HANDLING",
  UTILITY = "UTILITY",
  CONVEYOR = "CONVEYOR",
  CNC = "CNC",
  ROBOTIC = "ROBOTIC",
  OTHER = "OTHER",
}

export enum MachinePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum MaintenanceType {
  PREVENTIVE = "PREVENTIVE",
  CORRECTIVE = "CORRECTIVE",
  EMERGENCY = "EMERGENCY",
  PREDICTIVE = "PREDICTIVE",
  CALIBRATION = "CALIBRATION",
}

export class CreateMachineDto {
  @ApiProperty({ example: "CNC Milling Machine A1" })
  @IsString()
  name: string;

  @ApiProperty({ example: "CNC-001" })
  @IsString()
  code: string;

  @ApiProperty({
    example: "High-precision CNC milling machine for metal components",
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  description?: string;

  @ApiProperty({ enum: MachineType })
  @IsEnum(MachineType)
  machineType: MachineType;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  plantId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  productionLineId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "Zone A, Area 2, Position 3" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  location?: string;

  @ApiProperty({ example: "24/7 operation with scheduled breaks" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: 1000 })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ example: 95.5 })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsNumber()
  @Min(0)
  efficiency?: number;

  @ApiProperty({ example: "Additional machine information" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: ["Safety", "Quality", "Production"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @ApiProperty({ example: ["ISO 9001", "ISO 14001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: ["Sensor A", "Motor B", "Controller C"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  components?: string[];

  @ApiProperty({ example: "2024-01-15" })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ example: "2024-01-15" })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiProperty({ example: "2029-01-15" })
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiProperty({ example: "ABC Manufacturing Co." })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ example: "MODEL-X-2024" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: "SN-123456789" })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}

export class UpdateMachineDto {
  @ApiProperty({ example: "Updated machine name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ enum: MachineType })
  @IsOptional()
  @IsEnum(MachineType)
  machineType?: MachineType;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  productionLineId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "Updated location" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  location?: string;

  @ApiProperty({ example: "Updated operating hours" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: 1500 })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ example: 98.5 })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsNumber()
  @Min(0)
  efficiency?: number;

  @ApiProperty({ example: "Updated notes" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  notes?: string;

  @ApiProperty({ example: ["Safety", "Quality", "Production", "Maintenance"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @ApiProperty({ example: ["ISO 9001", "ISO 14001", "OHSAS 18001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: ["Sensor A", "Motor B", "Controller C", "Sensor D"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  components?: string[];

  @ApiProperty({ example: "2024-01-15" })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ example: "2024-01-15" })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiProperty({ example: "2029-01-15" })
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiProperty({ example: "Updated manufacturer" })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ example: "Updated model" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: "Updated serial number" })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}

export class MachineQueryDto {
  @ApiProperty({ example: "ACTIVE", required: false })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ example: "PRODUCTION", required: false })
  @IsOptional()
  @IsEnum(MachineType)
  machineType?: MachineType;

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
  productionLineId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  supervisorId?: string;

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

export class MachineStatsQueryDto {
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
  productionLineId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "2024", required: false })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({ example: "01", required: false })
  @IsOptional()
  @IsString()
  month?: string;
}

export enum MaintenanceStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  OVERDUE = "OVERDUE",
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: "Routine maintenance check" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Scheduled preventive maintenance for CNC machine" })
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty({ example: "2024-02-15" })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  estimatedDuration: number; // in hours

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  machineId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ example: ["Spare parts", "Tools", "Lubricants"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredParts?: string[];

  @ApiProperty({ example: "Additional maintenance notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaintenanceDto {
  @ApiProperty({ example: "Updated maintenance title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "2024-02-16" })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ example: 6000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ example: ["Updated spare parts", "New tools"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredParts?: string[];

  @ApiProperty({ example: "Updated maintenance notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
