import { BadRequestException } from "@nestjs/common";

/**
 * Validates that startDate is before or equal to endDate
 */
export function validateDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  fieldName = "date range",
) {
  if (!startDate || !endDate) return;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    throw new BadRequestException(`Invalid startDate in ${fieldName}`);
  }

  if (isNaN(end.getTime())) {
    throw new BadRequestException(`Invalid endDate in ${fieldName}`);
  }

  if (start > end) {
    throw new BadRequestException(`startDate cannot be after endDate in ${fieldName}`);
  }
}

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};
