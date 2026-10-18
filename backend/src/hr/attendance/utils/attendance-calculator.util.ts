import { AttendanceStatus, LeaveDurationType, ShiftType } from "@prisma/tenant-client";
import { AttendanceMetrics, ShiftSnapshot } from "./interfaces";

export type { AttendanceMetrics, ShiftSnapshot };

/** Converts "HH:MM" to total minutes from midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * Total scheduled minutes for a shift.
 * For midnight-crossing shifts (e.g. 22:00 → 06:00):
 *   duration = (24*60 - startMins) + endMins
 */
export function getShiftDurationMinutes(shift: ShiftSnapshot): number {
  const startMins = hhmmToMinutes(shift.startTime);
  const endMins = hhmmToMinutes(shift.endTime);

  if (shift.crossesMidnight) {
    return 24 * 60 - startMins + endMins;
  }

  return endMins - startMins;
}

/** Scheduled shift duration minus the shift's unpaid break. */
export function getNetShiftDurationMinutes(shift: ShiftSnapshot): number {
  return getShiftDurationMinutes(shift) - shift.breakMinutes;
}

/**
 * Calculates how many minutes late the employee checked in.
 *
 * Detection: checkIn > shiftStart + graceMinutes
 * Deduction: counted from shiftStart (not from grace end).
 * FLEXIBLE shifts have no fixed start → always 0.
 * A HALF_DAY approved leave for the date forces this to 0 regardless of actual check-in time.
 */
export function calculateLateMinutes(
  checkInMinutes: number,
  shift: ShiftSnapshot,
  leaveDurationType: LeaveDurationType | null = null,
): number {
  if (leaveDurationType === LeaveDurationType.HALF_DAY) return 0;
  if (shift.type === ShiftType.FLEXIBLE) return 0;

  const shiftStartMinutes = hhmmToMinutes(shift.startTime);
  // No grace period configured is treated the same as an explicit 0.
  const graceEnd = shiftStartMinutes + (shift.graceMinutes ?? 0);

  if (checkInMinutes <= graceEnd) return 0;

  return checkInMinutes - shiftStartMinutes;
}

/**
 * The minutes an employee is required to be present for, given the shift and
 * any approved leave for the date:
 *   - No leave: netShiftDuration
 *   - HALF_DAY leave: round(netShiftDuration / 2)
 *   - FULL_DAY leave: 0 (moot — check-in is blocked on full-day leave)
 * Lateness reduces the requirement rather than extending the day — a late
 * employee isn't required to stay past the shift's normal end to compensate,
 * since lateMinutes is already tracked as its own separate penalty.
 */
export function calculateRequiredMinutes(
  netShiftDuration: number,
  leaveDurationType: LeaveDurationType | null,
  lateMinutes: number,
): number {
  const baseRequiredMinutes =
    leaveDurationType === LeaveDurationType.FULL_DAY
      ? 0
      : leaveDurationType === LeaveDurationType.HALF_DAY
        ? Math.round(netShiftDuration / 2)
        : netShiftDuration;

  return Math.max(0, baseRequiredMinutes - lateMinutes);
}

/**
 * Derives all attendance metrics once both checkIn and checkOut are known.
 * All times are in minutes from midnight (timezone-free integers).
 *
 * Midnight-crossing: if checkOutMinutes < checkInMinutes, 24*60 is added to
 * checkOut for arithmetic so the difference is always positive.
 *
 * workedMinutes is the raw elapsed check-in→check-out span (unadjusted — useful
 * as "total time spent present"). netWorkedMinutes nets the shift's break out of
 * that span so it's comparable to requiredMinutes, which is already net of break;
 * without this, a full shift attended exactly as scheduled would show phantom
 * overtime equal to the break length.
 *
 *   missingMinutes (early exit) = max(0, requiredMinutes − netWorkedMinutes)
 *   overtimeMinutes             = max(0, netWorkedMinutes − requiredMinutes)
 *
 * lateMinutes and missingMinutes are independent and can both be nonzero on the
 * same record (late arrival + early departure = two distinct problems).
 *
 * status is HALF_DAY when an approved half-day leave covers the date, PRESENT otherwise.
 */
export function calculateAttendanceMetrics(
  checkInMinutes: number,
  checkOutMinutes: number,
  shift: ShiftSnapshot,
  leaveDurationType: LeaveDurationType | null = null,
): AttendanceMetrics {
  // Normalize checkOut across midnight so arithmetic is always positive
  const normalizedCheckOut =
    checkOutMinutes < checkInMinutes ? checkOutMinutes + 24 * 60 : checkOutMinutes;

  const workedMinutes = Math.max(0, normalizedCheckOut - checkInMinutes);
  const netWorkedMinutes = Math.max(0, workedMinutes - shift.breakMinutes);

  const lateMinutes = calculateLateMinutes(checkInMinutes, shift, leaveDurationType);

  const netShiftDuration = getNetShiftDurationMinutes(shift);
  const requiredMinutes = calculateRequiredMinutes(
    netShiftDuration,
    leaveDurationType,
    lateMinutes,
  );

  const earlyExitMinutes = Math.max(0, requiredMinutes - netWorkedMinutes);
  const overtimeMinutes = Math.max(0, netWorkedMinutes - requiredMinutes);

  const status =
    leaveDurationType === LeaveDurationType.HALF_DAY
      ? AttendanceStatus.HALF_DAY
      : AttendanceStatus.PRESENT;

  return { workedMinutes, lateMinutes, earlyExitMinutes, overtimeMinutes, status };
}
