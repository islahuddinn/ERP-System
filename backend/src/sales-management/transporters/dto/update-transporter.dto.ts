import { PartialType } from "@nestjs/swagger";
import { CreateTransporterDto } from "./create-transporter.dto";

export class UpdateTransporterDto extends PartialType(CreateTransporterDto) {}
