import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

// No branchId in the body — a distributor can only assign a Sales Person to
// their own branch, resolved server-side, never taken from the request.
export class AssignSalesPersonDto {
  @ApiProperty({ description: "Employee to assign as a Sales Person under my branch" })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;
}
