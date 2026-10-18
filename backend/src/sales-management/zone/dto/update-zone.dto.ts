import { PartialType } from "@nestjs/swagger";
import { CreateSalesZoneDto } from "./create-zone.dto";

export class UpdateSalesZoneDto extends PartialType(CreateSalesZoneDto) {}
