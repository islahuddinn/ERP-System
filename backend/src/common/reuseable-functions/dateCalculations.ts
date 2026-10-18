import { Decimal } from "@prisma/client/runtime/library";
import { WeekDay } from "@prisma/tenant-client";

export function calculateTotalCalendarDays(periodStart: Date, periodEnd: Date): number {
  const diffTime = periodEnd.getTime() - periodStart.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateWeekends(
  periodStart: Date,
  periodEnd: Date,
  weeklyOffDays: WeekDay[] = [WeekDay.SUNDAY, WeekDay.SATURDAY],
): number {
  const weekDayValues = new Set(weeklyOffDays.map((day) => getWeekDayValue(day)));

  let weekendCount = 0;

  const current = new Date(periodStart);

  while (current <= periodEnd) {
    const day = current.getDay();
    if (weekDayValues.has(day)) {
      weekendCount += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return weekendCount;
}

export function getNonWeekendDates(
  startDate: Date,
  endDate: Date,
  weeklyOffDays: WeekDay[] = [WeekDay.SUNDAY, WeekDay.SATURDAY],
): string[] {
  const weekDayValues = new Set(weeklyOffDays.map((day) => getWeekDayValue(day)));
  const dates: string[] = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    if (!weekDayValues.has(current.getDay())) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getWeekDayValue(day: WeekDay): number {
  const dayMap: Record<WeekDay, number> = {
    [WeekDay.SUNDAY]: 0,
    [WeekDay.MONDAY]: 1,
    [WeekDay.TUESDAY]: 2,
    [WeekDay.WEDNESDAY]: 3,
    [WeekDay.THURSDAY]: 4,
    [WeekDay.FRIDAY]: 5,
    [WeekDay.SATURDAY]: 6,
  };
  return dayMap[day];
}

export function calculateWorkingDays(
  totalCalendarDays: number,
  holidays: number,
  weekends: number,
): Decimal {
  const workingDays = totalCalendarDays - holidays - weekends;
  return new Decimal(Math.max(workingDays, 0));
}
