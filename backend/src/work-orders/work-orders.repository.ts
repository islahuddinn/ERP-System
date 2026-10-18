import { Injectable } from "@nestjs/common";
import { PrismaClient, WorkOrderStatus, ProductionPriority } from "@prisma/tenant-client";

@Injectable()
export class WorkOrdersRepository {
  async create(
    tenantClient: PrismaClient,
    data: {
      workOrderNumber: string;
      productionOrderId: string;
      title: string;
      description?: string;
      status: WorkOrderStatus;
      priority: ProductionPriority;
      scheduledStartDate: Date;
      scheduledEndDate: Date;
      assignedToId?: string;
      notes?: string;
      tenantId: string;
    },
  ) {
    return tenantClient.workOrder.create({
      data,
      include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(tenantClient: PrismaClient, tenantId: string, filters: any) {
    const where: any = {
      tenantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.productionOrderId) {
      where.productionOrderId = filters.productionOrderId;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.search) {
      where.OR = [
        { workOrderNumber: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.scheduledStartDate = {};
      if (filters.startDate) where.scheduledStartDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.scheduledStartDate.lte = new Date(filters.endDate);
    }

    const page = parseInt(filters.page || "1");
    const limit = parseInt(filters.limit || "10");
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      tenantClient.workOrder.findMany({
        where,
        include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
      },
        orderBy: {
          scheduledStartDate: "asc",
        },
        skip,
        take: limit,
      }),
      tenantClient.workOrder.count({ where }),
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
    return tenantClient.workOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async update(tenantClient: PrismaClient, id: string, data: any, tenantId: string) {
    return tenantClient.workOrder.update({
      where: {
        id,
        tenantId,
      },
      data,
      include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async remove(tenantClient: PrismaClient, id: string, tenantId: string) {
    // WorkOrder doesn't have deletedAt, so use hard delete
    return tenantClient.workOrder.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  async getSchedule(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.scheduledStartDate = {};
      if (startDate) where.scheduledStartDate.gte = new Date(startDate);
      if (endDate) where.scheduledStartDate.lte = new Date(endDate);
    }

    return tenantClient.workOrder.findMany({
      where,
      include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        scheduledStartDate: "asc",
      },
    });
  }
}
