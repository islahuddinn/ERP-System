import { Injectable } from "@nestjs/common";
import { fetchUsersMap, toUserOrNull, UsersMap } from "../utils/users-map.helper";

@Injectable()
export class CandidateRepository {
  async create(prisma: any, data: any) {
    const candidate = await prisma.candidate.create({ data });
    const usersMap = await fetchUsersMap(prisma, [candidate.createdById]);
    return this.serializeCandidate(candidate, usersMap);
  }

  async findById(prisma: any, id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            requisition: {
              include: {
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });
    if (!candidate) return null;

    const usersMap = await fetchUsersMap(prisma, [candidate.createdById]);
    return this.serializeCandidate(candidate, usersMap);
  }

  async findByEmail(prisma: any, tenantId: string, email: string) {
    return prisma.candidate.findFirst({
      where: { tenantId, email },
    });
  }

  async list(prisma: any, tenantId: string, filters: any = {}) {
    const { page = 1, limit = 20, search, source } = filters;
    const where: any = { tenantId };

    if (source) where.source = source;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        include: {
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.candidate.count({ where }),
    ]);

    const usersMap = await fetchUsersMap(prisma, candidates.map((c: any) => c.createdById));
    const items = candidates.map((candidate: any) => this.serializeCandidate(candidate, usersMap));

    return { items, total, page, limit };
  }

  async update(prisma: any, id: string, data: any) {
    const candidate = await prisma.candidate.update({
      where: { id },
      data,
    });
    const usersMap = await fetchUsersMap(prisma, [candidate.createdById]);
    return this.serializeCandidate(candidate, usersMap);
  }

  async delete(prisma: any, id: string) {
    return prisma.candidate.delete({
      where: { id },
    });
  }

  private serializeCandidate(candidate: any, usersMap: UsersMap) {
    return {
      ...candidate,
      creator: toUserOrNull(candidate.createdById, usersMap),
    };
  }
}
