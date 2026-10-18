import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { CreateUOMDto } from "./dto/create-uom.dto";
import { UomCategory, UomCode, UomSymbol } from "./utils/enums";
import {
  UOM_CATEGORY_BY_CODE,
  UOM_CODE_BY_SYMBOL,
  UOM_SYMBOL_BY_CODE,
} from "./utils/uom-seed-data";
import { UomQueryDto } from "./dto/uom-query.dto";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class UOMsService {
  constructor(
    private readonly tenantPrismaContext: TenantPrismaContextService,
    private readonly auditContext: AuditContextService,
  ) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) {
      throw new BadRequestException("Tenant context is required for UOM operations");
    }
    return client;
  }

  async findAll(): Promise<Record<string, unknown[]>> {
    const uoms = await this.prisma.uOM.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        symbol: true,
        code: true,
        category: true,
        isSystem: true,
        description: true,
        isActive: true,
      },
    });

    return Object.values(UomCategory).reduce(
      (acc, cat) => {
        acc[cat] = uoms.filter((u) => u.category === cat);
        return acc;
      },
      {} as Record<string, typeof uoms>,
    );
  }

  async findByCategory(uomQueryDto: UomQueryDto) {
    const { category } = uomQueryDto;

    return this.prisma.uOM.findMany({
      where: { category, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        symbol: true,
        code: true,
        category: true,
        isSystem: true,
        description: true,
      },
    });
  }

  async create(dto: CreateUOMDto, userId?: string) {
    // If the code matches a system code, enforce category and symbol consistency
    if (dto.code in UOM_CATEGORY_BY_CODE) {
      const expectedCategory = UOM_CATEGORY_BY_CODE[dto.code as UomCode];

      if (dto.category !== expectedCategory) {
        throw new BadRequestException(
          `Code "${dto.code}" belongs to category "${expectedCategory}", not "${dto.category}"`,
        );
      }
      const expectedSymbol = UOM_SYMBOL_BY_CODE[dto.code as UomCode];
      if (dto.symbol !== expectedSymbol) {
        throw new BadRequestException(
          `Code "${dto.code}" must use symbol "${expectedSymbol}", not "${dto.symbol}"`,
        );
      }
    }

    // If the symbol matches a system symbol, it must be used with its owning code
    if (dto.symbol in UOM_CODE_BY_SYMBOL) {
      const expectedCode = UOM_CODE_BY_SYMBOL[dto.symbol as UomSymbol];
      if (dto.code !== expectedCode) {
        throw new BadRequestException(
          `Symbol "${dto.symbol}" belongs to code "${expectedCode}" — use a different symbol for custom UOMs`,
        );
      }
    }

    const existingCode = await this.prisma.uOM.findUnique({ where: { code: dto.code } });
    if (existingCode) {
      throw new ConflictException(`UOM with code "${dto.code}" already exists`);
    }

    const existingName = await this.prisma.uOM.findFirst({
      where: { name: { equals: dto.name, mode: "insensitive" }, category: dto.category },
    });
    if (existingName) {
      throw new ConflictException(`A UOM named "${dto.name}" already exists in the ${dto.category} category`);
    }

    return this.prisma.uOM.create({
      data: {
        name: dto.name,
        symbol: dto.symbol,
        code: dto.code,
        category: dto.category,
        description: dto.description,
        isActive: dto.isActive ?? true,
        isSystem: false,
        createdById: userId ?? null,
        updatedById: userId ?? null,
      },
    });
  }

  async dropdown(uomQueryDto: UomQueryDto) {
    const { category } = uomQueryDto;
    return this.prisma.uOM.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, symbol: true, code: true, category: true },
    });
  }

  async remove(uomId: string) {
    const uom = await this.prisma.uOM.findUnique({
      where: { id: uomId },
      include: {
        _count: { select: { products: true, rawMaterials: true } },
      },
    });

    if (!uom) {
      throw new NotFoundException("UOM not found");
    }
    if (uom.isSystem) {
      throw new ForbiddenException("System UOMs cannot be deleted");
    }
    if (uom._count.products > 0 || uom._count.rawMaterials > 0) {
      throw new ConflictException("Cannot delete UOM that is in use by products or raw materials");
    }

    this.auditContext.setOldValue(uom);
    this.auditContext.setEntityLabel(uom.name);

    await this.prisma.uOM.delete({ where: { id: uomId } });
    return { message: "UOM deleted successfully" };
  }
}
