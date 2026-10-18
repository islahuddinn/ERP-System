import { Injectable } from "@nestjs/common";
import { fetchUsersMap, toUserOrNull, UsersMap } from "../utils/users-map.helper";

const APPLICATION_BASE_INCLUDE = {
  candidate: true,
  requisition: {
    include: {
      department: true,
      position: true,
    },
  },
};

@Injectable()
export class ApplicationRepository {
  async create(prisma: any, data: any) {
    const application = await prisma.application.create({
      data,
      include: APPLICATION_BASE_INCLUDE,
    });
    const usersMap = await fetchUsersMap(prisma, [application.createdById]);
    return this.serializeApplication(application, usersMap);
  }

  async findById(prisma: any, id: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        ...APPLICATION_BASE_INCLUDE,
        interviews: {
          orderBy: { interviewDate: 'desc' },
        },
        offers: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!application) return null;

    const usersMap = await fetchUsersMap(prisma, [
      application.createdById,
      ...application.interviews.map((interview: any) => interview.interviewerId),
    ]);

    return {
      ...this.serializeApplication(application, usersMap),
      interviews: application.interviews.map((interview: any) => ({
        ...interview,
        interviewer: toUserOrNull(interview.interviewerId, usersMap),
      })),
    };
  }

  async list(prisma: any, tenantId: string, filters: any = {}) {
    const { page = 1, limit = 20, search, candidateId, requisitionId, stage } = filters;
    const where: any = { tenantId };

    if (candidateId) where.candidateId = candidateId;
    if (requisitionId) where.requisitionId = requisitionId;
    if (stage) where.stage = stage;
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { email: { contains: search, mode: 'insensitive' } } },
        { requisition: { title: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          ...APPLICATION_BASE_INCLUDE,
          _count: { select: { interviews: true, offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    const usersMap = await fetchUsersMap(prisma, applications.map((a: any) => a.createdById));
    const items = applications.map((application: any) =>
      this.serializeApplication(application, usersMap),
    );

    return { items, total, page, limit };
  }

  async update(prisma: any, id: string, data: any) {
    const application = await prisma.application.update({
      where: { id },
      data,
      include: APPLICATION_BASE_INCLUDE,
    });
    const usersMap = await fetchUsersMap(prisma, [application.createdById]);
    return this.serializeApplication(application, usersMap);
  }

  async updateStage(prisma: any, id: string, stage: string, notes?: string) {
    return prisma.application.update({
      where: { id },
      data: { stage, notes },
      include: APPLICATION_BASE_INCLUDE,
    });
  }

  async delete(prisma: any, id: string) {
    return prisma.application.delete({
      where: { id },
    });
  }

  async findByCandidateAndRequisition(prisma: any, candidateId: string, requisitionId: string) {
    return prisma.application.findFirst({
      where: { candidateId, requisitionId },
    });
  }

  private serializeApplication(application: any, usersMap: UsersMap) {
    return {
      ...application,
      creator: toUserOrNull(application.createdById, usersMap),
    };
  }
}
