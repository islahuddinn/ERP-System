import { Injectable } from "@nestjs/common";
import { HrSettings, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class HrSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFirst(): Promise<HrSettings | null> {
    return this.prisma.hrSettings.findFirst();
  }

  async create(): Promise<HrSettings> {
    return this.prisma.hrSettings.create({ data: {} });
  }

  async update(hrSettingsId: string, data: Prisma.HrSettingsUpdateInput): Promise<HrSettings> {
    return this.prisma.hrSettings.update({ where: { id: hrSettingsId }, data });
  }
}
