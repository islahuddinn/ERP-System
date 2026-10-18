import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class SettingsService {
  async getAccountSettings(tenantClient: PrismaClient, tenantId: string) {
    let settings = await tenantClient.settings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      // Create default settings
      settings = await tenantClient.settings.create({
        data: {
          tenantId,
          accountName: null,
          companyName: null,
          email: null,
          phone: null,
          address: null,
          city: null,
          postalCode: null,
          country: null,
          timezone: "UTC",
          currency: "PKR",
          language: "en",
          settings: {},
        },
      });
    }

    return settings;
  }

  async updateAccountSettings(tenantClient: PrismaClient, tenantId: string, updateData: any) {
    const existing = await tenantClient.settings.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      return tenantClient.settings.create({
        data: {
          tenantId,
          ...updateData,
        },
      });
    }

    return tenantClient.settings.update({
      where: { tenantId },
      data: updateData,
    });
  }
}
