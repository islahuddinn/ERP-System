import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { CreateOrgUnitDto } from "../dto/create-org-unit.dto";
import { UpdateOrgUnitDto } from "../dto/update-org-unit.dto";

export interface OrgChartEmployeeNode {
  id: string;
  employeeCode: string;
  fullName: string;
  positionTitle?: string | null;
}

export interface OrgChartNode {
  id: string;
  name: string;
  type: string;
  children: OrgChartNode[];
  employees: OrgChartEmployeeNode[];
}

@Injectable()
export class OrgUnitService {
  constructor(private readonly prismaService: MultiTenantPrismaService) {}

  private async getTenantClient(tenantId: string): Promise<any> {
    return (await this.prismaService.getTenantClient(tenantId)) as any;
  }

  async listOrgUnits(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.orgUnit.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async getOrgUnit(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const [orgUnit, children] = await Promise.all([
      prisma.orgUnit.findUnique({ where: { id } }),
      prisma.orgUnit.findMany({
        where: { parentId: id },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
    ]);

    if (!orgUnit) {
      throw new NotFoundException(`Org unit with ID ${id} not found`);
    }

    // Org units are not linked to employees in the schema yet, so the list is always empty.
    return { ...orgUnit, children, employees: [] };
  }

  async createOrgUnit(tenantId: string, dto: CreateOrgUnitDto, userId: string) {
    const prisma = await this.getTenantClient(tenantId);
    return prisma.orgUnit.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
        createdById: userId,
      },
    });
  }

  async updateOrgUnit(
    tenantId: string,
    id: string,
    dto: UpdateOrgUnitDto,
    userId: string,
  ) {
    const prisma = await this.getTenantClient(tenantId);
    const existing = await prisma.orgUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Org unit with ID ${id} not found`);
    }

    return prisma.orgUnit.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        type: dto.type ?? existing.type,
        parentId:
          dto.parentId !== undefined ? dto.parentId : existing.parentId,
        createdById: existing.createdById ?? userId,
      },
    });
  }

  async deleteOrgUnit(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const [existing, childCount] = await Promise.all([
      prisma.orgUnit.findUnique({ where: { id } }),
      prisma.orgUnit.count({ where: { parentId: id } }),
    ]);

    if (!existing) {
      throw new NotFoundException(`Org unit with ID ${id} not found`);
    }

    if (childCount > 0) {
      throw new ConflictException(
        "Cannot delete org unit with child org units. Reassign or delete children first.",
      );
    }

    await prisma.orgUnit.delete({ where: { id } });
  }

  async getOrgTree(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);
    const units = await prisma.orgUnit.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const byId = new Map<string, any>();
    units.forEach((u) => byId.set(u.id, { ...u, children: [] as any[] }));

    const roots: any[] = [];
    for (const unit of units) {
      const node = byId.get(unit.id);
      if (unit.parentId && byId.has(unit.parentId)) {
        byId.get(unit.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Build an org chart tree of org units. Employees are not linked to org units
   * in the schema yet, so every node's employee list is empty.
   */
  async getOrgChart(tenantId: string): Promise<OrgChartNode[]> {
    const prisma = await this.getTenantClient(tenantId);
    const units = await prisma.orgUnit.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const unitNodes = new Map<string, OrgChartNode>();
    for (const unit of units) {
      unitNodes.set(unit.id, {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        children: [],
        employees: [],
      });
    }

    const roots: OrgChartNode[] = [];
    for (const unit of units) {
      const node = unitNodes.get(unit.id)!;
      if (unit.parentId && unitNodes.has(unit.parentId)) {
        unitNodes.get(unit.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
