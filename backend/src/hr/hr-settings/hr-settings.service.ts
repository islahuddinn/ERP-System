import { Injectable } from "@nestjs/common";
import { HrSettings, Prisma } from "@prisma/tenant-client";
import { AuditContextService } from "../../audit/audit-context.service";
import { HrSettingsRepository } from "./hr-settings.repository";
import { UpdateHrSettingsDto } from "./dto/update-hr-settings.dto";

@Injectable()
export class HrSettingsService {
  constructor(
    private readonly hrSettingsRepository: HrSettingsRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async getSettings(): Promise<HrSettings> {
    return this.getOrCreateSettings();
  }

  async updateSettings(updateHrSettingsDto: UpdateHrSettingsDto): Promise<HrSettings> {
    const existingSettings = await this.getOrCreateSettings();

    const { weeklyOffDays, timezone, currency, settings, maxLoanInstallmentPercent } =
      updateHrSettingsDto;

    this.auditContext.setEntityId(existingSettings.id);
    this.auditContext.setOldValue(existingSettings);

    return this.hrSettingsRepository.update(existingSettings.id, {
      ...(weeklyOffDays !== undefined && { weeklyOffDays }),
      ...(timezone !== undefined && { timezone }),
      ...(currency !== undefined && { currency }),
      ...(settings !== undefined && { settings: settings as Prisma.InputJsonValue }),
      ...(maxLoanInstallmentPercent !== undefined && { maxLoanInstallmentPercent }),
    });
  }

  private async getOrCreateSettings(): Promise<HrSettings> {
    const existingSettings = await this.hrSettingsRepository.findFirst();
    if (existingSettings) return existingSettings;
    return this.hrSettingsRepository.create();
  }
}
