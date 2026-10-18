import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Shift } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ShiftRepository } from "./shift.repository";
import { ShiftDetail } from "./utils/types";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { ShiftFiltersDto } from "./dto/shift-filters.dto";

@Injectable()
export class ShiftService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listShifts(shiftFiltersDto: ShiftFiltersDto): Promise<PaginatedResponse<Shift>> {
    return this.shiftRepository.findAll(shiftFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string; type: string }[]> {
    return this.shiftRepository.dropdown();
  }

  async getShift(shiftId: string): Promise<ShiftDetail> {
    return this.checkExistence(shiftId);
  }

  async createShift(createShiftDto: CreateShiftDto): Promise<ShiftDetail> {
    const {
      name,
      description,
      type,
      startTime,
      endTime,
      crossesMidnight,
      graceMinutes,
      breakMinutes,
    } = createShiftDto;

    const effectiveCrossesMidnight = crossesMidnight ?? false;
    this.validateShiftTiming(startTime, endTime, effectiveCrossesMidnight);

    try {
      return await this.shiftRepository.create({
        name,
        description: description ?? null,
        type,
        startTime,
        endTime,
        crossesMidnight: effectiveCrossesMidnight,
        graceMinutes: graceMinutes ?? 0,
        breakMinutes: breakMinutes ?? 0,
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A shift with this name already exists");
    }
  }

  async updateShift(shiftId: string, updateShiftDto: UpdateShiftDto): Promise<ShiftDetail> {
    const existingShift = await this.checkExistence(shiftId);

    const {
      name,
      description,
      type,
      startTime,
      endTime,
      crossesMidnight,
      graceMinutes,
      breakMinutes,
    } = updateShiftDto;

    // Validate the effective (merged) timing — a PATCH may only send one of
    // startTime/endTime/crossesMidnight, so the other side must fall back to
    // the value already saved on the shift.
    const effectiveStartTime = startTime ?? existingShift.startTime;
    const effectiveEndTime = endTime ?? existingShift.endTime;
    const effectiveCrossesMidnight = crossesMidnight ?? existingShift.crossesMidnight;
    this.validateShiftTiming(effectiveStartTime, effectiveEndTime, effectiveCrossesMidnight);

    this.auditContext.setOldValue(existingShift);
    this.auditContext.setEntityLabel(existingShift.name);

    try {
      return await this.shiftRepository.update(shiftId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(crossesMidnight !== undefined && { crossesMidnight }),
        ...(graceMinutes !== undefined && { graceMinutes }),
        ...(breakMinutes !== undefined && { breakMinutes }),
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A shift with this name already exists");
    }
  }

  /**
   * Enforces the shift timing rules (#10, #11, #12):
   * - Start Time and End Time must not be identical.
   * - When the shift does NOT cross midnight, End Time must be strictly
   *   after Start Time (an overnight-looking range is only valid when
   *   crossesMidnight is explicitly set).
   *
   * Both times are "HH:MM" 24-hour strings, which compare correctly with a
   * plain string comparison since they are always zero-padded.
   */
  private validateShiftTiming(
    startTime: string,
    endTime: string,
    crossesMidnight: boolean,
  ): void {
    if (startTime === endTime) {
      throw new BadRequestException("Start Time and End Time cannot be identical");
    }

    if (!crossesMidnight && endTime < startTime) {
      throw new BadRequestException("End Time cannot be earlier than Start Time");
    }
  }

  async deleteShift(shiftId: string): Promise<{ message: string }> {
    const existingShift = await this.checkExistence(shiftId);

    if (await this.shiftRepository.hasEmployees(shiftId)) {
      throw new BadRequestException(
        "Cannot delete a shift that has employees assigned to it. Reassign employees first.",
      );
    }

    if (await this.shiftRepository.hasAttendances(shiftId)) {
      throw new BadRequestException(
        "Cannot delete a shift that is linked to existing attendance records.",
      );
    }

    this.auditContext.setOldValue(existingShift);
    this.auditContext.setEntityLabel(existingShift.name);

    await this.shiftRepository.delete(shiftId);
    return { message: "Shift deleted successfully" };
  }

  async checkExistence(shiftId: string): Promise<ShiftDetail> {
    const shift = await this.shiftRepository.findById(shiftId);
    if (!shift) throw new NotFoundException("Shift not found");
    return shift;
  }
}
