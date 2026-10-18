import { Injectable } from "@nestjs/common";
import { MultiTenantPrismaService } from "../prisma/multi-tenant-prisma.service";
import { CreateTaxRuleDto } from "./dto/create-tax-rule.dto";
import { UpdateTaxRuleDto } from "./dto/update-tax-rule.dto";
import { CreateDeductionRuleDto } from "./dto/create-deduction-rule.dto";
import { UpdateDeductionRuleDto } from "./dto/update-deduction-rule.dto";
import { CreateWorkingCalendarDto } from "./dto/create-working-calendar.dto";
import { UpdateWorkingCalendarDto } from "./dto/update-working-calendar.dto";
import { CreateSalaryComponentDto } from "./dto/create-salary-component.dto";
import { UpdateSalaryComponentDto } from "./dto/update-salary-component.dto";

const DAY_MS = 24 * 60 * 60 * 1000;

interface HolidayDateRange {
  startDate: Date;
  endDate: Date;
  type: string;
}

@Injectable()
export class HrConfigService {
  constructor(private readonly prismaService: MultiTenantPrismaService) {}

  // Multi-tenant Prisma client exposes tenant-specific models that are not part of the base PrismaClient type.
  // We intentionally type this as any to allow access to those dynamic model properties in a type-safe way at runtime.
  private async getTenantClient(tenantId: string): Promise<any> {
    return (await this.prismaService.getTenantClient(tenantId)) as any;
  }

  async listTaxRules(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.taxRule.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async createTaxRule(tenantId: string, dto: CreateTaxRuleDto, userId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.taxRule.create({
      data: {
        countryCode: dto.countryCode,
        name: dto.name,
        slabMin: dto.slabMin,
        slabMax: dto.slabMax ?? null,
        ratePercent: dto.ratePercent,
        isActive: dto.isActive ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdById: userId,
      },
    });
  }

  async updateTaxRule(tenantId: string, id: string, dto: UpdateTaxRuleDto) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.taxRule.update({
      where: { id },
      data: {
        ...(dto.countryCode && { countryCode: dto.countryCode }),
        ...(dto.name && { name: dto.name }),
        ...(dto.slabMin && { slabMin: dto.slabMin }),
        ...(dto.slabMax !== undefined && { slabMax: dto.slabMax }),
        ...(dto.ratePercent && { ratePercent: dto.ratePercent }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && {
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        }),
      },
    });
  }

  async deleteTaxRule(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    // soft delete via isActive flag to avoid breaking history
    return prisma.taxRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listDeductionRules(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.deductionRule.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async createDeductionRule(tenantId: string, dto: CreateDeductionRuleDto, userId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.deductionRule.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        calculationType: dto.calculationType,
        amount: dto.amount !== undefined ? dto.amount : null,
        ratePercent: dto.ratePercent !== undefined ? dto.ratePercent : null,
        formula: dto.formula ?? null,
        isStatutory: dto.isStatutory ?? false,
        isActive: dto.isActive ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdById: userId,
      },
    });
  }

  async updateDeductionRule(tenantId: string, id: string, dto: UpdateDeductionRuleDto) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.deductionRule.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.calculationType && { calculationType: dto.calculationType }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.ratePercent !== undefined && { ratePercent: dto.ratePercent }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.isStatutory !== undefined && { isStatutory: dto.isStatutory }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && {
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        }),
      },
    });
  }

  async deleteDeductionRule(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.deductionRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listWorkingCalendars(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    const [calendars, holidays] = await Promise.all([
      prisma.workingCalendar.findMany({
        orderBy: [{ year: "desc" }, { name: "asc" }],
      }),
      this.fetchHolidayDates(prisma),
    ]);
    return calendars.map((calendar) => this.serializeWorkingCalendar(calendar, holidays));
  }

  async createWorkingCalendar(
    tenantId: string,
    createWorkingCalendarDto: CreateWorkingCalendarDto,
    userId: string,
  ) {
    const prisma = await this.getTenantClient(tenantId);
    const { name, year, countryCode, weekendDays, isActive } = createWorkingCalendarDto;

    const calendar = await prisma.workingCalendar.create({
      data: {
        name,
        year,
        countryCode,
        weekendDays: weekendDays.map(String),
        isActive: isActive ?? true,
        createdById: userId,
      },
    });

    return this.serializeWorkingCalendar(calendar, await this.fetchHolidayDates(prisma));
  }

  async updateWorkingCalendar(
    tenantId: string,
    id: string,
    updateWorkingCalendarDto: UpdateWorkingCalendarDto,
  ) {
    const prisma = await this.getTenantClient(tenantId);
    const { name, year, countryCode, weekendDays, isActive } = updateWorkingCalendarDto;

    const calendar = await prisma.workingCalendar.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(year !== undefined && { year }),
        ...(countryCode && { countryCode }),
        ...(weekendDays && { weekendDays: weekendDays.map(String) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return this.serializeWorkingCalendar(calendar, await this.fetchHolidayDates(prisma));
  }

  async deleteWorkingCalendar(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.workingCalendar.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Working days are derived at fetch time from the calendar's weekend config plus the
  // standalone Holiday module (hr_holidays) — they are intentionally not stored.
  private async fetchHolidayDates(prisma: any): Promise<HolidayDateRange[]> {
    return prisma.holiday.findMany({
      select: { startDate: true, endDate: true, type: true },
    });
  }

  private serializeWorkingCalendar(calendar: any, holidays: HolidayDateRange[]) {
    const weekendDayNumbers = new Set<number>((calendar.weekendDays ?? []).map(Number));
    const yearStart = Date.UTC(calendar.year, 0, 1);
    const yearEndExclusive = Date.UTC(calendar.year + 1, 0, 1);
    const totalDays = Math.round((yearEndExclusive - yearStart) / DAY_MS);

    // Deduction per holiday date within the year (1 = full day, 0.5 = half day),
    // deduped across overlapping holiday ranges by keeping the larger deduction.
    const holidayDeductionByDate = new Map<number, number>();
    for (const holiday of holidays) {
      const deduction = holiday.type === "HALF_DAY" ? 0.5 : 1;
      const from = Math.max(this.toUtcMidnight(holiday.startDate), yearStart);
      const to = Math.min(this.toUtcMidnight(holiday.endDate), yearEndExclusive - DAY_MS);
      for (let date = from; date <= to; date += DAY_MS) {
        holidayDeductionByDate.set(date, Math.max(holidayDeductionByDate.get(date) ?? 0, deduction));
      }
    }

    let weekendDayCount = 0;
    let holidayDayCount = 0;
    for (let date = yearStart; date < yearEndExclusive; date += DAY_MS) {
      if (weekendDayNumbers.has(new Date(date).getUTCDay())) {
        weekendDayCount += 1;
        continue;
      }
      holidayDayCount += holidayDeductionByDate.get(date) ?? 0;
    }

    return {
      ...calendar,
      weekendDays: [...weekendDayNumbers],
      totalDays,
      weekendDayCount,
      holidayDayCount,
      workingDays: totalDays - weekendDayCount - holidayDayCount,
    };
  }

  private toUtcMidnight(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  async listSalaryComponents(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.salaryComponent.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async createSalaryComponent(tenantId: string, dto: CreateSalaryComponentDto, userId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.salaryComponent.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        category: dto.category ?? null,
        calculationType: dto.calculationType,
        amount: dto.amount !== undefined ? dto.amount : null,
        percentage: dto.percentage !== undefined ? dto.percentage : null,
        formula: dto.formula ?? null,
        isTaxable: dto.isTaxable ?? true,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdById: userId,
      },
    });
  }

  async updateSalaryComponent(tenantId: string, id: string, dto: UpdateSalaryComponentDto) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.salaryComponent.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.calculationType && { calculationType: dto.calculationType }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.percentage !== undefined && { percentage: dto.percentage }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && {
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        }),
      },
    });
  }

  async deleteSalaryComponent(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.salaryComponent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
