import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaClient, Prisma } from "@prisma/tenant-client";
import {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  MaterialTransferStatus,
} from "./dto/material-transfer.dto";

@Injectable()
export class MaterialTransfersRepository {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateMaterialTransferDto, tenantId: string) {
    // Build data object, excluding undefined optional fields
    const data: any = {
      transferNumber: createDto.transferNumber,
      title: createDto.title,
      description: createDto.description,
      transferType: createDto.transferType,
      priority: createDto.priority,
      scheduledDate: createDto.scheduledDate,
      sourceLocationType: createDto.sourceLocationType,
      sourceLocationId: createDto.sourceLocationId,
      destinationLocationType: createDto.destinationLocationType,
      destinationLocationId: createDto.destinationLocationId,
      tenantId,
      status: MaterialTransferStatus.PENDING,
      notes: createDto.notes || null,
      expectedDeliveryDate: createDto.expectedDeliveryDate || null,
      sourceLocationDetails: createDto.sourceLocationDetails || null,
      destinationLocationDetails: createDto.destinationLocationDetails || null,
      items: {
        create: createDto.items.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          specifications: (item as any).specifications || null,
        })),
      },
    };

    // Only include optional fields if they are defined
    if (createDto.requestedById) {
      data.requestedById = createDto.requestedById;
    }
    if (createDto.approvedById) {
      data.approvedById = createDto.approvedById;
    }
    if (createDto.transporterId) {
      data.transporterId = createDto.transporterId;
    }

    return this.prisma.materialTransfer.create({
      data,
      include: {
        items: {
          include: {
            material: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, filters: any = {}) {
    const where = {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.transferType && { transferType: filters.transferType }),
      ...(filters.sourceLocationType && {
        sourceLocationType: filters.sourceLocationType,
      }),
      ...(filters.sourceLocationId && {
        sourceLocationId: filters.sourceLocationId,
      }),
      ...(filters.destinationLocationType && {
        destinationLocationType: filters.destinationLocationType,
      }),
      ...(filters.destinationLocationId && {
        destinationLocationId: filters.destinationLocationId,
      }),
      ...(filters.startDate && {
        scheduledDate: {
          gte: new Date(filters.startDate),
        },
      }),
      ...(filters.endDate && {
        scheduledDate: {
          lte: new Date(filters.endDate),
        },
      }),
    };

    const [transfers, total] = await Promise.all([
      this.prisma.materialTransfer.findMany({
        where,
        include: {
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
      this.prisma.materialTransfer.count({ where }),
    ]);

    return { transfers, total };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
      include: {
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
    updateDto: UpdateMaterialTransferDto,
    tenantId: string,
  ) {
    return tenantClient.materialTransfer.update({
      where: { id, tenantId },
      data: updateDto,
      include: {
        items: {
          include: {
            material: true,
          },
        },
      },
    });
  }

  async remove(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    id: string,
    tenantId: string,
  ) {
    return tenantClient.materialTransfer.delete({
      where: { id, tenantId },
    });
  }

  async updateStatus(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    id: string,
    status: MaterialTransferStatus,
    tenantId: string,
    userId?: string,
    comments?: string,
  ) {
    const updateData: any = { status };

    if (status === MaterialTransferStatus.APPROVED) {
      updateData.approvedDate = new Date();
      updateData.approvedById = userId;
      updateData.approvalComments = comments;
    } else if (status === MaterialTransferStatus.IN_TRANSIT) {
      updateData.inTransitDate = new Date();
      updateData.transporterId = userId;
    } else if (status === MaterialTransferStatus.RECEIVED) {
      updateData.receivedDate = new Date();
      updateData.receivedById = userId;
      updateData.receivingComments = comments;
    }

    return tenantClient.materialTransfer.update({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async updateItem(
    tenantClient: PrismaClient | Prisma.TransactionClient,
    id: string,
    updateDto: any,
    tenantId: string,
  ) {
    return tenantClient.materialTransferItem.update({
      where: { id },
      data: updateDto,
      include: {
        material: true,
        materialTransfer: true,
      },
    });
  }

  async getMaterialTransferStats(tenantId: string, locationType?: string, locationId?: string) {
    let where: any = { tenantId };

    if (locationType && locationId) {
      where = {
        ...where,
        OR: [
          {
            sourceLocationType: locationType as any,
            sourceLocationId: locationId,
          },
          {
            destinationLocationType: locationType as any,
            destinationLocationId: locationId,
          },
        ],
      };
    }

    const [
      totalTransfers,
      pendingTransfers,
      approvedTransfers,
      inTransitTransfers,
      receivedTransfers,
      cancelledTransfers,
    ] = await Promise.all([
      this.prisma.materialTransfer.count({ where }),
      this.prisma.materialTransfer.count({
        where: { ...where, status: MaterialTransferStatus.PENDING },
      }),
      this.prisma.materialTransfer.count({
        where: { ...where, status: MaterialTransferStatus.APPROVED },
      }),
      this.prisma.materialTransfer.count({
        where: { ...where, status: MaterialTransferStatus.IN_TRANSIT },
      }),
      this.prisma.materialTransfer.count({
        where: { ...where, status: MaterialTransferStatus.RECEIVED },
      }),
      this.prisma.materialTransfer.count({
        where: { ...where, status: MaterialTransferStatus.CANCELLED },
      }),
    ]);

    return {
      totalTransfers,
      pendingTransfers,
      approvedTransfers,
      inTransitTransfers,
      receivedTransfers,
      cancelledTransfers,
      completionRate: totalTransfers > 0 ? (receivedTransfers / totalTransfers) * 100 : 0,
    };
  }

  async validateLocation(locationId: string, locationType: string, tenantId: string) {
    switch (locationType) {
      case "WAREHOUSE":
        return this.prisma.warehouse.findFirst({
          where: { id: locationId, isActive: true },
        });
      case "PLANT":
        return this.prisma.plant.findFirst({
          where: { id: locationId, isActive: true },
        });
      case "DEPARTMENT":
        return this.prisma.user.findFirst({
          where: { id: locationId },
        });
      default:
        return null;
    }
  }

  async validateUser(userId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
    });
  }

  async validateMaterial(materialId: string, tenantId: string) {
    return this.prisma.product.findFirst({
      where: { id: materialId, isActive: true },
    });
  }

  async countTransfersInMonth(tenantId: string, year: number, month: string) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, parseInt(month), 0);

    return this.prisma.materialTransfer.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  async transferNumberExists(transferNumber: string, tenantId: string): Promise<boolean> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: {
        transferNumber,
        tenantId,
      },
    });
    return !!existing;
  }

  async getActiveTransfersByLocation(tenantId: string, locationType: string, locationId: string) {
    return this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: {
          in: [MaterialTransferStatus.APPROVED, MaterialTransferStatus.IN_TRANSIT],
        },
        OR: [
          {
            sourceLocationType: locationType as any,
            sourceLocationId: locationId,
          },
          {
            destinationLocationType: locationType as any,
            destinationLocationId: locationId,
          },
        ],
      },
      include: {
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });
  }
}
