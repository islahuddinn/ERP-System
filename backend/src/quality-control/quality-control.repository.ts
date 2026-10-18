import { Injectable } from "@nestjs/common";
import { PrismaClient, QualityStatus } from "@prisma/tenant-client";

@Injectable()
export class QualityControlRepository {
  async create(
    tenantClient: PrismaClient,
    data: {
      inspectionNumber: string;
      batchId?: string;
      productId: string;
      inspectionType: string;
      qualityStatus: QualityStatus;
      results: string;
      inspectedById?: string;
      notes?: string;
      observations: string[];
      tenantId: string;
    },
  ) {
    return tenantClient.qualityControl.create({
      data: {
        inspectionNumber: data.inspectionNumber,
        batchId: data.batchId,
        productId: data.productId,
        inspectionType: data.inspectionType as any,
        qualityStatus: data.qualityStatus,
        results: data.results,
        inspectedById: data.inspectedById,
        notes: data.notes,
        observations: data.observations,
        tenantId: data.tenantId,
      },
      include: {
        product: true,
        rawMaterialBatch: true,
      },
    });
  }

  async findAll(tenantClient: PrismaClient, tenantId: string, filters: any) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.qualityStatus) {
      where.qualityStatus = filters.qualityStatus;
    }

    if (filters.startDate || filters.endDate) {
      where.inspectedDate = {};
      if (filters.startDate) where.inspectedDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.inspectedDate.lte = new Date(filters.endDate);
    }

    const page = parseInt(filters.page || "1");
    const limit = parseInt(filters.limit || "10");
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      tenantClient.qualityControl.findMany({
        where,
        include: {
          product: true,
          rawMaterialBatch: true,
        },
        orderBy: {
          inspectedDate: "desc",
        },
        skip,
        take: limit,
      }),
      tenantClient.qualityControl.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantClient: PrismaClient, id: string, tenantId: string) {
    return tenantClient.qualityControl.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        product: true,
        rawMaterialBatch: true,
      },
    });
  }

  async update(tenantClient: PrismaClient, id: string, data: any, tenantId: string) {
    return tenantClient.qualityControl.update({
      where: {
        id,
        tenantId,
      },
      data,
      include: {
        product: true,
        rawMaterialBatch: true,
      },
    });
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string) {
    return tenantClient.qualityControl.update({
      where: {
        id,
        tenantId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
