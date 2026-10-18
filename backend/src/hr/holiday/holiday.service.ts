import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Holiday, HolidayType, WeekDay } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { getNonWeekendDates } from "../../common/reuseable-functions/dateCalculations";
import { AuditContextService } from "../../audit/audit-context.service";
import { HrSettingsService } from "../hr-settings/hr-settings.service";
import { HolidayRepository } from "./holiday.repository";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { HolidayFiltersDto } from "./dto/holiday-filters.dto";

export type HolidayResponse = Omit<Holiday, "startDate" | "endDate"> & {
  startDate: string;
  endDate: string;
  // Individual non-weekend dates covered by the holiday — only populated for FULL_DAY holidays.
  dates?: string[];
};

@Injectable()
export class HolidayService {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly hrSettingsService: HrSettingsService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listHolidays(
    holidayFiltersDto: HolidayFiltersDto,
  ): Promise<PaginatedResponse<HolidayResponse>> {
    const [{ data, meta }, { weeklyOffDays }] = await Promise.all([
      this.holidayRepository.findAll(holidayFiltersDto),
      this.hrSettingsService.getSettings(),
    ]);
    return { data: data.map((holiday) => this.toResponse(holiday, weeklyOffDays)), meta };
  }

  async getHoliday(holidayId: string): Promise<HolidayResponse> {
    const [holiday, { weeklyOffDays }] = await Promise.all([
      this.checkExistence(holidayId),
      this.hrSettingsService.getSettings(),
    ]);
    return this.toResponse(holiday, weeklyOffDays);
  }

  async createHoliday(createHolidayDto: CreateHolidayDto): Promise<HolidayResponse> {
    const { name, description, type = HolidayType.FULL_DAY, startDate, endDate } = createHolidayDto;

    const { startDate: resolvedStartDate, endDate: resolvedEndDate } = this.resolveDateRange(
      type,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
    );

    const [, { weeklyOffDays }] = await Promise.all([
      this.checkNoOverlap(resolvedStartDate, resolvedEndDate),
      this.hrSettingsService.getSettings(),
    ]);

    try {
      const holiday = await this.holidayRepository.create({
        name,
        description: description ?? null,
        type,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
      });
      return this.toResponse(holiday, weeklyOffDays);
    } catch (error) {
      handlePrismaUniqueError(error, "A holiday with this name already exists on this start date");
    }
  }

  async updateHoliday(
    holidayId: string,
    updateHolidayDto: UpdateHolidayDto,
  ): Promise<HolidayResponse> {
    const [existingHoliday, { weeklyOffDays }] = await Promise.all([
      this.checkExistence(holidayId),
      this.hrSettingsService.getSettings(),
    ]);

    const { name, description, type, startDate, endDate } = updateHolidayDto;

    const effectiveType = type ?? existingHoliday.type;
    const effectiveStartDate = startDate ? new Date(startDate) : existingHoliday.startDate;
    const effectiveEndDate = endDate ? new Date(endDate) : existingHoliday.endDate;

    // Only treat date/type as "being changed" when the requested value actually
    // differs from what's already stored — the frontend always resubmits the
    // current type/startDate/endDate alongside name/description edits, so a
    // presence-only check would block a name-only edit on a past holiday too.
    const isDateFieldChangeRequested =
      (type !== undefined && type !== existingHoliday.type) ||
      (startDate !== undefined &&
        this.formatDateOnly(effectiveStartDate) !== this.formatDateOnly(existingHoliday.startDate)) ||
      (endDate !== undefined &&
        this.formatDateOnly(effectiveEndDate) !== this.formatDateOnly(existingHoliday.endDate));

    if (
      isDateFieldChangeRequested &&
      (this.isPastOrToday(existingHoliday.startDate) || this.isPastOrToday(effectiveStartDate))
    ) {
      throw new BadRequestException(
        "Cannot change the date or type of a holiday that has already started, or move it to today or the past",
      );
    }

    const { startDate: resolvedStartDate, endDate: resolvedEndDate } = this.resolveDateRange(
      effectiveType,
      effectiveStartDate,
      effectiveEndDate,
    );

    if (isDateFieldChangeRequested) {
      await this.checkNoOverlap(resolvedStartDate, resolvedEndDate, holidayId);
    }

    // Snapshot the old value in the EXACT same shape toResponse produces for the
    // new value — formatted date-only startDate/endDate AND the computed `dates`
    // array (FULL_DAY only). Building the snapshot any other way leaves fields
    // out of sync with the response the audit interceptor diffs against, so the
    // diff falsely flags Start/End Date, or `dates`, as changed on a name-only
    // edit (dates showed "— → [full array]" because the old snapshot had no
    // `dates` field at all).
    this.auditContext.setOldValue(this.toResponse(existingHoliday, weeklyOffDays));
    this.auditContext.setEntityLabel(existingHoliday.name);

    try {
      const holiday = await this.holidayRepository.update(holidayId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isDateFieldChangeRequested && {
          type: effectiveType,
          startDate: resolvedStartDate,
          endDate: resolvedEndDate,
        }),
      });
      return this.toResponse(holiday, weeklyOffDays);
    } catch (error) {
      handlePrismaUniqueError(error, "A holiday with this name already exists on this start date");
    }
  }

  async deleteHoliday(holidayId: string): Promise<{ message: string }> {
    const existingHoliday = await this.checkExistence(holidayId);

    if (this.isPastOrToday(existingHoliday.startDate)) {
      throw new BadRequestException("Cannot delete a holiday that has already started or passed");
    }

    this.auditContext.setOldValue(existingHoliday);
    this.auditContext.setEntityLabel(existingHoliday.name);

    await this.holidayRepository.delete(holidayId);
    return { message: "Holiday deleted successfully" };
  }

  async checkExistence(holidayId: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findById(holidayId);
    if (!holiday) throw new NotFoundException("Holiday not found");
    return holiday;
  }

  async countInPeriod(periodStart: Date, periodEnd: Date): Promise<number> {
    return this.holidayRepository.countInPeriod(periodStart, periodEnd);
  }

  async findHolidaysInRange(startDate: Date, endDate: Date): Promise<Holiday[]> {
    return this.holidayRepository.findAllOverlapping(startDate, endDate);
  }

  private async checkNoOverlap(
    startDate: Date,
    endDate: Date,
    excludeHolidayId?: string,
  ): Promise<void> {
    const overlappingHoliday = await this.holidayRepository.findOverlapping(
      startDate,
      endDate,
      excludeHolidayId,
    );

    if (overlappingHoliday) {
      throw new BadRequestException(
        `Holiday dates overlap with an existing holiday: "${overlappingHoliday.name}"`,
      );
    }
  }

  private isPastOrToday(date: Date): boolean {
    const todayDateString = this.formatDateOnly(new Date());
    return this.formatDateOnly(date) <= todayDateString;
  }

  private toResponse(holiday: Holiday, weeklyOffDays: WeekDay[]): HolidayResponse {
    return {
      ...holiday,
      startDate: this.formatDateOnly(holiday.startDate),
      endDate: this.formatDateOnly(holiday.endDate),
      ...(holiday.type === HolidayType.FULL_DAY && {
        dates: getNonWeekendDates(holiday.startDate, holiday.endDate, weeklyOffDays),
      }),
    };
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  // HALF_DAY always applies to a single date, so endDate is forced to match startDate.
  private resolveDateRange(
    type: HolidayType,
    startDate: Date,
    endDate?: Date,
  ): { startDate: Date; endDate: Date } {
    if (type === HolidayType.HALF_DAY) {
      return { startDate, endDate: startDate };
    }

    if (!endDate) {
      throw new BadRequestException("endDate is required for full-day holidays");
    }

    if (endDate < startDate) {
      throw new BadRequestException("endDate cannot be before startDate");
    }

    return { startDate, endDate };
  }
}
