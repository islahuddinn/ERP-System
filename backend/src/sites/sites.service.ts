import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { SitesRepository } from "./sites.repository";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdateSiteDto } from "./dto/update-site.dto";
import { SitesQueryDto } from "./dto/sites-query.dto";
import { SiteStatus } from "./enums/site-status.enum";
import { RequestWithUser } from "src/common/interfaces";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class SitesService {
  constructor(
    private readonly sitesRepository: SitesRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(createSiteDto: CreateSiteDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const { parentId } = createSiteDto;

    if (parentId) await this.checkExistence(parentId);

    try {
      return await this.sitesRepository.create({ ...createSiteDto, createdById: userId });
    } catch (error) {
      throw this.handleUniqueConstraintError(error);
    }
  }

  async findAll(sitesQueryDto: SitesQueryDto) {
    return this.sitesRepository.findAll(sitesQueryDto);
  }

  async tree() {
    const allSites = await this.sitesRepository.findAllForTree();
    return this.buildTree(allSites);
  }

  async findOne(siteId: string) {
    const site = await this.sitesRepository.findById(siteId);
    if (!site) throw new NotFoundException(`Site with ID: "${siteId}" not found`);
    return site;
  }

  async findChildren(siteId: string) {
    await this.checkExistence(siteId);

    return this.sitesRepository.findChildren(siteId);
  }

  async findAncestors(siteId: string) {
    await this.checkExistence(siteId);

    return this.sitesRepository.findAncestors(siteId);
  }

  async update(siteId: string, updateSiteDto: UpdateSiteDto) {
    // Snapshot with the SAME shape the update returns (SITE_SELECT) so the audit
    // diff is symmetric — no "Parent Details" / empty "Children" relation noise.
    const existing = await this.sitesRepository.findByIdBasic(siteId);
    if (!existing) throw new NotFoundException(`Site with ID: "${siteId}" not found`);
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    const { parentId } = updateSiteDto;

    if (parentId !== undefined) {
      if (parentId === siteId) {
        throw new BadRequestException("A site cannot be its own parent");
      }
      if (parentId) {
        await this.checkExistence(parentId);

        const isCircular = await this.isDescendant(siteId, parentId);

        if (isCircular) {
          throw new BadRequestException(
            "Cannot set a descendant as parent — circular hierarchy detected",
          );
        }
      }
    }

    try {
      return await this.sitesRepository.update(siteId, updateSiteDto);
    } catch (error) {
      throw this.handleUniqueConstraintError(error);
    }
  }

  async updateStatus(siteId: string, status: SiteStatus) {
    const existing = await this.findOne(siteId);
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);
    return this.sitesRepository.updateStatus(siteId, status);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);
    await this.sitesRepository.updateStatus(id, SiteStatus.INACTIVE);
    return { message: "Site marked as inactive" };
  }

  async dropdown() {
    return this.sitesRepository.dropdown();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private handleUniqueConstraintError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fields = ((error.meta?.target as string[]) ?? []).join(", ");
      throw new ConflictException(`Duplicate value for: ${fields}`);
    }
    throw error;
  }

  private async checkExistence(id: string) {
    const exists = await this.sitesRepository.checkExistence(id);
    if (!exists) throw new NotFoundException(`Site with ID "${id}" not found`);
  }

  private async isDescendant(ancestorId: string, potentialDescendantId: string): Promise<boolean> {
    const allLinks = await this.sitesRepository.findAllIdParentPairs();

    const childrenMap = new Map<string, string[]>();
    for (const { id, parentId } of allLinks) {
      if (parentId) {
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)!.push(id);
      }
    }

    const queue = [...(childrenMap.get(ancestorId) ?? [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (current === potentialDescendantId) return true;
      queue.push(...(childrenMap.get(current) ?? []));
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildTree(sites: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const site of sites) {
      map.set(site.id, { ...site, children: [] });
    }

    for (const site of sites) {
      const node = map.get(site.id)!;
      if (site.parentId && map.has(site.parentId)) {
        map.get(site.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
