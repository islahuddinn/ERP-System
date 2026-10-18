import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
  Matches,
} from "class-validator";

export class UpdateInvoiceSettingsDto {
  // Page Settings
  @ApiPropertyOptional({ example: "A4", enum: ["A4", "A5", "A6", "CUSTOM"] })
  @IsOptional()
  @IsString()
  @IsIn(["A4", "A5", "A6", "CUSTOM"])
  pageSize?: string;

  @ApiPropertyOptional({ example: "portrait", enum: ["portrait", "landscape"] })
  @IsOptional()
  @IsString()
  @IsIn(["portrait", "landscape"])
  pageOrientation?: string;

  @ApiPropertyOptional({ example: 200, description: "Custom page width in mm" })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  customPageWidth?: number;

  @ApiPropertyOptional({
    example: 300,
    description: "Custom page height in mm",
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  customPageHeight?: number;

  @ApiPropertyOptional({ example: 16, description: "Margin in mm" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  margin?: number;

  // Header Settings
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({ example: 50, description: "Logo size in mm" })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  logoSize?: number;

  @ApiPropertyOptional({ example: "center", enum: ["left", "center", "right"] })
  @IsOptional()
  @IsString()
  @IsIn(["left", "center", "right"])
  logoPosition?: string;

  @ApiPropertyOptional({
    example: 19,
    description: "Brand name font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(72)
  brandNameFontSize?: number;

  @ApiPropertyOptional({
    example: "#111827",
    description: "Brand name color in hex format",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "brandNameColor must be a valid hex color (e.g., #111827)",
  })
  brandNameColor?: string;

  @ApiPropertyOptional({ example: "SALES RECEIPT" })
  @IsOptional()
  @IsString()
  receiptTitle?: string;

  @ApiPropertyOptional({
    example: 11,
    description: "Receipt title font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(48)
  receiptTitleFontSize?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showLocationAddress?: boolean;

  // Content Settings
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showCustomerInfo?: boolean;

  @ApiPropertyOptional({
    example: 11,
    description: "Customer info font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(48)
  customerInfoFontSize?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showItemsTable?: boolean;

  @ApiPropertyOptional({
    example: 9,
    description: "Items table font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(48)
  itemsTableFontSize?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showPayments?: boolean;

  @ApiPropertyOptional({
    example: 9,
    description: "Payments font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(48)
  paymentsFontSize?: number;

  // Footer Settings
  @ApiPropertyOptional({ example: "Thank you for your business" })
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;

  @ApiPropertyOptional({
    example: 8,
    description: "Footer font size in points",
  })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(48)
  footerFontSize?: number;

  @ApiPropertyOptional({
    example: "#9ca3af",
    description: "Footer color in hex format",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "footerColor must be a valid hex color (e.g., #9ca3af)",
  })
  footerColor?: string;

  // Color Scheme
  @ApiPropertyOptional({
    example: "#d1d5db",
    description: "Divider color in hex format",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "dividerColor must be a valid hex color (e.g., #d1d5db)",
  })
  dividerColor?: string;

  @ApiPropertyOptional({
    example: "dashed",
    enum: ["solid", "dashed", "dotted"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["solid", "dashed", "dotted"])
  dividerStyle?: string;

  @ApiPropertyOptional({
    example: "#ffffff",
    description: "Background color in hex format (optional)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "backgroundColor must be a valid hex color (e.g., #ffffff)",
  })
  backgroundColor?: string;

  @ApiPropertyOptional({
    example: "#111827",
    description: "Text color in hex format",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "textColor must be a valid hex color (e.g., #111827)",
  })
  textColor?: string;
}
