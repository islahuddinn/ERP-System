import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaClient, Prisma } from "@prisma/tenant-client";
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  MaterialRequestStatus,
} from "./dto/material-request.dto";

@Injectable()
export class MaterialRequestsRepository {
  private readonly logger = new Logger(MaterialRequestsRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    createDto: CreateMaterialRequestDto,
    tenantId: string,
  ) {
    try {
      this.logger.error("[MATERIAL-REQUEST-REPOSITORY] Starting create:", {
        hasTenantClient: !!tenantClient,
        tenantId,
        dtoKeys: Object.keys(createDto || {}),
        materialsCount: createDto?.materials?.length,
      });

      // Validate materials array exists and is non-empty
      if (
        !createDto.materials ||
        !Array.isArray(createDto.materials) ||
        createDto.materials.length === 0
      ) {
        this.logger.error("[MATERIAL-REQUEST-REPOSITORY] Validation failed: materials array empty");
        throw new BadRequestException("At least one material item is required");
      }

      // Extract materials array - DO NOT spread createDto anywhere to avoid accidentally including materials
      const materials = createDto.materials;

      // Convert requiredDate string to DateTime if needed
      const requiredDate =
        typeof createDto.requiredDate === "string"
          ? new Date(createDto.requiredDate)
          : createDto.requiredDate;

      if (!requiredDate || isNaN(requiredDate.getTime())) {
        this.logger.error(
          "[MATERIAL-REQUEST-REPOSITORY] Invalid requiredDate:",
          createDto.requiredDate,
        );
        throw new BadRequestException("Invalid requiredDate format. Expected ISO date string.");
      }

      // Validate required fields
      if (!createDto.requestNumber) {
        throw new BadRequestException("Request number is required");
      }
      if (!createDto.title) {
        throw new BadRequestException("Title is required");
      }
      if (!createDto.description) {
        throw new BadRequestException("Description is required");
      }
      if (!createDto.requestType) {
        throw new BadRequestException("Request type is required");
      }
      if (!createDto.priority) {
        throw new BadRequestException("Priority is required");
      }
      if (!createDto.plantId) {
        throw new BadRequestException("Plant ID is required");
      }

      // Build Prisma data object EXPLICITLY - only valid schema fields, NO materials field
      // DO NOT spread createDto - manually construct each field to ensure materials is never included
      const prismaData: any = {
        // Required fields - set explicitly
        requestNumber: createDto.requestNumber,
        title: createDto.title,
        description: createDto.description,
        requestType: createDto.requestType,
        priority: createDto.priority,
        requiredDate: requiredDate,
        plantId: createDto.plantId,
        tenantId: tenantId,
        status: createDto.status || MaterialRequestStatus.DRAFT,

        // Optional fields - only include if defined
        ...(createDto.notes !== undefined &&
          createDto.notes !== null && { notes: createDto.notes }),
        ...(createDto.productionOrderId && {
          productionOrderId: createDto.productionOrderId,
        }),
        ...(createDto.departmentId && { departmentId: createDto.departmentId }),
        ...(createDto.requestedById && {
          requestedById: createDto.requestedById,
        }),
        ...(createDto.approvedById && { approvedById: createDto.approvedById }),
        ...(createDto.warehouseId && { warehouseId: createDto.warehouseId }),

        // Relation field - MUST be 'items', NOT 'materials'
        items: {
          create: materials.map((item) => {
            // Validate each material item
            if (!item.materialId) {
              throw new BadRequestException("Material ID is required for each item");
            }
            if (!item.requestedQuantity || item.requestedQuantity <= 0) {
              throw new BadRequestException(
                `Invalid requested quantity for material ${item.materialId}. Must be greater than 0.`,
              );
            }
            return {
              materialId: item.materialId,
              requestedQuantity: parseFloat(String(item.requestedQuantity)),
              specifications: (item as any).specifications || null,
            };
          }),
        },
      };

      // FINAL SAFETY CHECK: Remove materials if it somehow exists (should never happen)
      if ("materials" in prismaData) {
        this.logger.error(
          "[MATERIAL-REQUEST-REPOSITORY] CRITICAL ERROR: materials field found in prismaData! Removing it.",
        );
        delete prismaData.materials;
      }

      this.logger.error(
        "[MATERIAL-REQUEST-REPOSITORY] Final Prisma payload keys:",
        Object.keys(prismaData),
      );
      this.logger.error(
        "[MATERIAL-REQUEST-REPOSITORY] Final Prisma payload (without items array):",
        JSON.stringify(
          {
            ...prismaData,
            items: { create: `[${materials.length} items]` },
          },
          null,
          2,
        ),
      );

      return await tenantClient.materialRequest.create({
        data: prismaData,
        include: {
          plant: true,
          productionOrder: true,
          items: {
            include: {
              material: true,
            },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        "[MATERIAL-REQUEST-REPOSITORY] Prisma create error:",
        JSON.stringify(
          {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack,
            errorName: error.constructor.name,
            cause: error.cause,
          },
          null,
          2,
        ),
      );
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Convert Prisma errors to BadRequestException
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async findAll(tenantId: string, filters: any = {}) {
    const where = {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.requestType && { requestType: filters.requestType }),
      ...(filters.plantId && { plantId: filters.plantId }),
      ...(filters.requestedById && { requestedById: filters.requestedById }),
      ...(filters.startDate && {
        createdAt: {
          gte: new Date(filters.startDate),
        },
      }),
      ...(filters.endDate && {
        createdAt: {
          lte: new Date(filters.endDate),
        },
      }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.materialRequest.findMany({
        where,
        include: {
          plant: true,
          productionOrder: true,
          items: {
            include: {
              material: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: filters.page ? (parseInt(filters.page) - 1) * parseInt(filters.limit || "10") : 0,
        take: parseInt(filters.limit || "10"),
      }),
      this.prisma.materialRequest.count({ where }),
    ]);

    return { requests, total };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.materialRequest.findFirst({
      where: { id, tenantId },
      include: {
        plant: true,
        productionOrder: true,
        items: {
          include: {
            material: true,
          },
        },
      },
    });
  }

  async update(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    id: string,
    updateDto: UpdateMaterialRequestDto,
    tenantId: string,
  ) {
    return tenantClient.materialRequest.update({
      where: { id, tenantId },
      data: updateDto,
      include: {
        plant: true,
        productionOrder: true,
        items: {
          include: {
            material: true,
          },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    return this.prisma.materialRequest.delete({
      where: { id, tenantId },
    });
  }

  async updateStatus(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    id: string,
    status: MaterialRequestStatus,
    tenantId: string,
    approverId?: string,
    comments?: string,
  ) {
    const updateData: any = { status };

    if (status === MaterialRequestStatus.APPROVED) {
      updateData.approvedDate = new Date();
      updateData.approvedById = approverId;
      updateData.approvalComments = comments;
    } else if (status === MaterialRequestStatus.FULFILLED) {
      updateData.fulfilledDate = new Date();
      updateData.fulfilledById = approverId;
    }

    return tenantClient.materialRequest.update({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async updateItem(id: string, updateDto: any, tenantId: string) {
    return this.prisma.materialRequestItem.update({
      where: { id },
      data: updateDto,
      include: {
        material: true,
        materialRequest: true,
      },
    });
  }

  async getMaterialRequestStats(tenantId: string, plantId?: string) {
    const where = {
      tenantId,
      ...(plantId && { plantId }),
    };

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      fulfilledRequests,
      cancelledRequests,
    ] = await Promise.all([
      this.prisma.materialRequest.count({ where }),
      this.prisma.materialRequest.count({
        where: { ...where, status: MaterialRequestStatus.PENDING },
      }),
      this.prisma.materialRequest.count({
        where: { ...where, status: MaterialRequestStatus.APPROVED },
      }),
      this.prisma.materialRequest.count({
        where: { ...where, status: MaterialRequestStatus.REJECTED },
      }),
      this.prisma.materialRequest.count({
        where: { ...where, status: MaterialRequestStatus.FULFILLED },
      }),
      this.prisma.materialRequest.count({
        where: { ...where, status: MaterialRequestStatus.CANCELLED },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      fulfilledRequests,
      cancelledRequests,
      approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0,
      fulfillmentRate: totalRequests > 0 ? (fulfilledRequests / totalRequests) * 100 : 0,
    };
  }

  async validatePlant(tenantClient: PrismaClient, plantId: string, tenantId: string) {
    return tenantClient.plant.findFirst({
      where: { id: plantId, isActive: true },
    });
  }

  async validateProductionOrder(tenantClient: PrismaClient, productionOrderId: string) {
    return tenantClient.productionOrder.findFirst({
      where: { id: productionOrderId },
    });
  }

  async validateUser(tenantClient: PrismaClient, userId: string, tenantId: string) {
    return tenantClient.user.findFirst({
      where: { id: userId },
    });
  }

  async validateMaterial(tenantClient: PrismaClient, materialId: string, tenantId: string) {
    return tenantClient.product.findFirst({
      where: { id: materialId, isActive: true },
    });
  }

  async countRequestsInMonth(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: string,
  ) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);

    return tenantClient.materialRequest.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
