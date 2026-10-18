import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUrl, MaxLength } from "class-validator";

export class AttachEmployeeDocumentDto {
  @ApiProperty({ description: "Document type (e.g. CNIC, CONTRACT, OFFER_LETTER)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  documentType: string;

  @ApiProperty({ description: "Public URL of the uploaded document" })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  fileUrl: string;
}
