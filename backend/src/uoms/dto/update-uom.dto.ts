import { PartialType } from "@nestjs/swagger";
import { CreateUOMDto } from "./create-uom.dto";

export class UpdateUOMDto extends PartialType(CreateUOMDto) {}
