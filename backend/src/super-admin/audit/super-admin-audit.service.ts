import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
// import { MasterPrismaService } from "../../master-prisma/master-prisma.service";

import { SuperAdminAuditAction, SuperAdminAuditEntityType } from "@prisma/master-client";
import { MasterPrismaService } from "src/master-prisma/master-prisma.service";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
@Injectable()
export class SuperAdminAuditService {
  private readonly logger = new Logger(SuperAdminAuditService.name);

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async createAuditLog(params: {
    actorId?: string;
    action: SuperAdminAuditAction;
    entityType: SuperAdminAuditEntityType;
    entityId: string;
    oldData?: any;
    newData?: any;
    metadata?: Record<string, any>;
  }) {
    const changes = this.buildDiff(params.oldData, params.newData);

    // 🚨 Don't store empty logs
    if (!changes || Object.keys(changes).length === 0) return;

    return this.masterPrisma.superAdminAuditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes,
        metadata: params.metadata ?? {},
      },
    });
  }

  // 🔥 Diff generator (field-level tracking)
  private buildDiff(oldObj: any, newObj: any) {
    const diff: Record<string, { old: any; new: any }> = {};

    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of keys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff[key] = {
          old: oldValue ?? null,
          new: newValue ?? null,
        };
      }
    }

    return diff;
  }

  async findAll(queryAuditLogDto: QueryAuditLogDto) {
    const { entityType, entityId, action, actorId } = queryAuditLogDto;

    return this.masterPrisma.superAdminAuditLog.findMany({
      where: {
        entityType,
        entityId,
        action,
        actorId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async findOne(auditLogId: string) {
    return this.masterPrisma.superAdminAuditLog.findUnique({
      where: { id: auditLogId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
