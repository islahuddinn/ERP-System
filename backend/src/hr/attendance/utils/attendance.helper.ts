import { LeaveDurationType } from "@prisma/tenant-client";
import {
  AttendanceMetrics,
  calculateAttendanceMetrics,
  ShiftSnapshot,
  hhmmToMinutes,
} from "./attendance-calculator.util";

export class AttendanceHelper {
  /** Regex and message used by all attendance DTOs to validate HH:MM inputs. */
  static readonly TIME_FORMAT_REGEX = /^\d{2}:\d{2}$/;
  static readonly TIME_FORMAT_MESSAGE = "Time must be in HH:MM format (24-hour)";

  /**
   * Returns the current local time as a "HH:MM" string.
   * Used when the caller omits a check-in/out time (defaults to now).
   */
  static currentTimeString(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  /**
   * Normalizes a user-supplied time string to always be "HH:MM".
   * Accepts "HH:MM" (passes through) or "HH:MM:SS" (strips seconds).
   */
  static normalizeTimeString(timeString: string): string {
    return timeString.substring(0, 5);
  }

  /**
   * Converts a "HH:MM" or "HH:MM:SS" time string to minutes from midnight.
   * Used internally for metric arithmetic — not stored in the DB.
   * e.g. "08:30:00" → 510
   */
  static timeStringToMinutes(timeString: string): number {
    return hhmmToMinutes(timeString);
  }

  /**
   * Converts minutes from midnight to a "HH:MM" display string.
   * e.g. 510 → "08:30"
   */
  static minutesToTimeString(minutes: number): string {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  /** Returns today's date as a "YYYY-MM-DD" string using local calendar time. */
  static todayString(): string {
    return AttendanceHelper.dateToDateString(new Date());
  }

  /** Formats a Date as a "YYYY-MM-DD" calendar string (local day) for date-only comparisons. */
  static dateToDateString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Returns a Prisma gte/lte string range covering every day in the given month (1-indexed). */
  static buildMonthDateRange(year: number, month: number): { gte: string; lte: string } {
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    return {
      gte: `${year}-${mm}-01`,
      lte: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  /**
   * Computes all attendance metrics when both checkIn and checkOut strings are present.
   * Converts times to minutes internally for calculation — the stored strings are unchanged.
   * Returns an empty object when either is missing so callers can safely spread
   * the result into a create/update payload without touching stored metric fields.
   */
  static computeMetricsIfComplete(
    checkIn: string,
    checkOut: string | null,
    shift: ShiftSnapshot | null,
    leaveDurationType: LeaveDurationType | null = null,
  ): Partial<AttendanceMetrics> {
    if (!checkIn || !checkOut || !shift) return {};

    const checkInMinutes = AttendanceHelper.timeStringToMinutes(checkIn);
    const checkOutMinutes = AttendanceHelper.timeStringToMinutes(checkOut);

    return calculateAttendanceMetrics(checkInMinutes, checkOutMinutes, shift, leaveDurationType);
  }
}
