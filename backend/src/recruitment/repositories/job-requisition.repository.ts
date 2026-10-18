import { Injectable } from "@nestjs/common";
import { fetchUsersMap, toUserOrNull, UsersMap } from "../utils/users-map.helper";

@Injectable()
export class JobRequisitionRepository {
  async create(prisma: any, data: any) {
    const requisition = await prisma.jobRequisition.create({ data });
    const usersMap = await fetchUsersMap(prisma, [requisition.createdById]);
    return this.serializeRequisition(requisition, usersMap);
  }

  async findById(prisma: any, id: string) {
    const requisition = await prisma.jobRequisition.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
        applications: {
          include: {
            candidate: true,
          },
        },
      },
    });
    if (!requisition) return null;

    const usersMap = await fetchUsersMap(prisma, [requisition.createdById]);
    return this.serializeRequisition(requisition, usersMap);
  }

  async list(prisma: any, tenantId: string, filters: any = {}) {
    const { page = 1, limit = 20, search, departmentId, positionId, status, employmentType } = filters;
    const where: any = { tenantId };

    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;
    if (status) where.status = status;
    if (employmentType) where.employmentType = employmentType;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [requisitions, total] = await Promise.all([
      prisma.jobRequisition.findMany({
        where,
        include: {
          department: true,
          position: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.jobRequisition.count({ where }),
    ]);

    const usersMap = await fetchUsersMap(prisma, requisitions.map((r: any) => r.createdById));
    const items = requisitions.map((requisition: any) =>
      this.serializeRequisition(requisition, usersMap),
    );

    return { items, total, page, limit };
  }

  async update(prisma: any, id: string, data: any) {
    const requisition = await prisma.jobRequisition.update({
      where: { id },
      data,
      include: {
        department: true,
        position: true,
      },
    });
    const usersMap = await fetchUsersMap(prisma, [requisition.createdById]);
    return this.serializeRequisition(requisition, usersMap);
  }

  async delete(prisma: any, id: string) {
    return prisma.jobRequisition.delete({
      where: { id },
    });
  }

  private serializeRequisition(requisition: any, usersMap: UsersMap) {
    return {
      ...requisition,
      creator: toUserOrNull(requisition.createdById, usersMap),
    };
  }
}
