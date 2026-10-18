import { BadRequestException } from "@nestjs/common";

export function validateDateRange(
  start: string | Date,
  end: string | Date | null | undefined,
  label = "endDate",
): void {
  if (!end) return;

  if (new Date(end) < new Date(start)) {
    throw new BadRequestException(`${label} cannot be before startDate`);
  }
}
