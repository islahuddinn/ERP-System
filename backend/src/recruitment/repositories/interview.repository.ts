import { Injectable } from "@nestjs/common";
import { fetchUsersMap, toUserOrNull, UsersMap } from "../utils/users-map.helper";

const INTERVIEW_INCLUDE = {
  application: {
    include: {
      candidate: true,
      requisition: {
        include: {
          department: true,
          position: true,
        },
      },
    },
  },
};

@Injectable()
export class InterviewRepository {
  async create(prisma: any, data: any) {
    const interview = await prisma.interview.create({
      data,
      include: INTERVIEW_INCLUDE,
    });
    return this.serializeInterview(interview, await this.fetchUsersForInterviews(prisma, [interview]));
  }

  async findById(prisma: any, id: string) {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: INTERVIEW_INCLUDE,
    });
    if (!interview) return null;

    return this.serializeInterview(interview, await this.fetchUsersForInterviews(prisma, [interview]));
  }

  async list(prisma: any, tenantId: string, filters: any = {}) {
    const { page = 1, limit = 20, applicationId, interviewerId, dateFrom, dateTo } = filters;
    const where: any = { tenantId };

    if (applicationId) where.applicationId = applicationId;
    if (interviewerId) where.interviewerId = interviewerId;
    if (dateFrom || dateTo) {
      where.interviewDate = {};
      if (dateFrom) where.interviewDate.gte = dateFrom;
      if (dateTo) where.interviewDate.lte = dateTo;
    }

    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        include: INTERVIEW_INCLUDE,
        orderBy: { interviewDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.interview.count({ where }),
    ]);

    const usersMap = await this.fetchUsersForInterviews(prisma, interviews);
    const items = interviews.map((interview: any) => this.serializeInterview(interview, usersMap));

    return { items, total, page, limit };
  }

  async update(prisma: any, id: string, data: any) {
    const interview = await prisma.interview.update({
      where: { id },
      data,
      include: INTERVIEW_INCLUDE,
    });
    return this.serializeInterview(interview, await this.fetchUsersForInterviews(prisma, [interview]));
  }

  async delete(prisma: any, id: string) {
    return prisma.interview.delete({
      where: { id },
    });
  }

  async findByInterviewerAndTime(prisma: any, interviewerId: string, interviewDate: Date) {
    const startOfDay = new Date(interviewDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(interviewDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.interview.findFirst({
      where: {
        interviewerId,
        interviewDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  private async fetchUsersForInterviews(prisma: any, interviews: any[]): Promise<UsersMap> {
    return fetchUsersMap(
      prisma,
      interviews.flatMap((interview) => [interview.interviewerId, interview.createdById]),
    );
  }

  private serializeInterview(interview: any, usersMap: UsersMap) {
    return {
      ...interview,
      interviewer: toUserOrNull(interview.interviewerId, usersMap),
      creator: toUserOrNull(interview.createdById, usersMap),
    };
  }
}
