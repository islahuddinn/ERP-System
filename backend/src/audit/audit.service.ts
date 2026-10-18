import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { FilterAuditLogsDto } from "./dto/filter-audit-logs.dto";
import { AuditModule } from "@prisma/tenant-client";
import { LogParams } from "./utils/types";
import { AUDIT_LOG_DEFAULT_LIMIT, AUDIT_LOG_MAX_LIMIT } from "./utils/constants";

@Injectable()
export class AuditService {
  private getPrisma(
    tenantClient?: PrismaClient | Prisma.TransactionClient,
  ): PrismaClient | Prisma.TransactionClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for audit operations");
    }
    return tenantClient;
  }

  async log(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    params: LogParams,
  ): Promise<void> {
    const {
      actorId,
      entityName,
      entityId,
      action,
      oldValue,
      newValue,
      module,
      entityLabel,
      metadata,
    } = params;
    const prisma = this.getPrisma(tenantClient);

    const safeOld = oldValue ? JSON.parse(JSON.stringify(oldValue)) : null;
    const safeNew = newValue ? JSON.parse(JSON.stringify(newValue)) : null;

    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          module: module ?? this.moduleFromEntity(entityName),
          entityName,
          entityId,
          entityLabel,
          action: action as any,
          oldValue: safeOld,
          newValue: safeNew,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    } catch (err) {
      // Never crash the main request flow due to an audit failure
      console.error("[AuditService] Failed to write audit log:", (err as any)?.message);
    }
  }

  /** List audit logs with filtering + pagination; actor name/email resolved at query time */
  async findAll(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    filters: FilterAuditLogsDto = new FilterAuditLogsDto(),
  ) {
    const prisma = this.getPrisma(tenantClient);

    const {
      module: moduleFilter,
      entityName,
      entityId,
      actorId,
      action: actionFilter,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
      page = 1,
      limit: rawLimit = AUDIT_LOG_DEFAULT_LIMIT,
    } = filters;

    const limit = Math.min(Number(rawLimit), AUDIT_LOG_MAX_LIMIT);
    const skip = (Math.max(Number(page), 1) - 1) * limit;

    // Allowlist the sortable columns to avoid invalid Prisma orderBy input;
    // default to newest-first when unspecified.
    const SORTABLE_FIELDS = new Set(["createdAt", "action", "module", "entityName"]);
    const orderByField = sortBy && SORTABLE_FIELDS.has(sortBy) ? sortBy : "createdAt";
    const orderDir: Prisma.SortOrder = String(sortOrder).toUpperCase() === "ASC" ? "asc" : "desc";
    const orderBy = { [orderByField]: orderDir } as Prisma.AuditLogOrderByWithRelationInput;

    const normalizedModule = moduleFilter
      ? (String(moduleFilter).toUpperCase() as AuditModule)
      : undefined;
    const normalizedAction = actionFilter ? String(actionFilter).toUpperCase() : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(normalizedModule ? { module: normalizedModule } : {}),
      ...(entityName ? { entityName } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorId ? { actorId } : {}),
      ...(normalizedAction ? { action: normalizedAction as any } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { entityName: { contains: search, mode: "insensitive" } },
              { entityLabel: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        select: {
          id: true,
          actorId: true,
          module: true,
          entityName: true,
          entityId: true,
          entityLabel: true,
          action: true,
          oldValue: true,
          newValue: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const items = await this.attachActors(prisma, logs);

    return {
      logs: items,
      total,
      page: Number(page),
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Get a single audit log entry by ID */
  async findOne(tenantClient: PrismaClient | Prisma.TransactionClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const log = await prisma.auditLog.findUnique({ where: { id } });
    if (!log) return null;
    const [enriched] = await this.attachActors(prisma, [log]);
    return enriched;
  }

  /** Get all logs for a specific record across its lifetime */
  async findByEntity(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    entityName: string,
    entityId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const logs = await prisma.auditLog.findMany({
      where: { entityName, entityId },
      orderBy: { createdAt: "desc" },
    });
    return this.attachActors(prisma, logs);
  }

  /** Dashboard summary */
  async getSummary(tenantClient: PrismaClient | Prisma.TransactionClient) {
    const prisma = this.getPrisma(tenantClient);

    const [totalLogs, recentLogs, byAction, byModule] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actorId: true,
          module: true,
          entityName: true,
          entityId: true,
          entityLabel: true,
          action: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
      }),
      prisma.auditLog.groupBy({
        by: ["module"],
        _count: { module: true },
      }),
    ]);

    const enrichedRecent = await this.attachActors(prisma, recentLogs);

    return {
      totalLogs,
      recentLogs: enrichedRecent,
      byAction: byAction.reduce(
        (acc, item) => ({ ...acc, [item.action]: item._count.action }),
        {} as Record<string, number>,
      ),
      byModule: byModule.reduce(
        (acc, item) => ({ ...acc, [item.module]: item._count.module }),
        {} as Record<string, number>,
      ),
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Joins a list of log entries with the users table to resolve actor name/email.
   * Returns the same list with an `actor: { id, name, email }` object on each entry.
   */
  private async attachActors(
    prisma: PrismaClient | Prisma.TransactionClient,
    logs: Array<{ actorId: string; [key: string]: any }>,
  ) {
    if (logs.length === 0) return logs;

    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))];

    const users = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(
      users.map((u) => [u.id, { ...u, name: `${u.firstName} ${u.lastName}`.trim() }]),
    );

    return logs.map((log) => ({
      ...log,
      actor: userMap.get(log.actorId) ?? { id: log.actorId, name: null, email: null },
    }));
  }

  private moduleFromEntity(_entityName: string): AuditModule {
    return AuditModule.SYSTEM;
  }
}
