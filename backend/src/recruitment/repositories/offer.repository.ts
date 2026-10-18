import { Injectable } from "@nestjs/common";
import { fetchUsersMap, toUserOrNull, UsersMap } from "../utils/users-map.helper";

const OFFER_INCLUDE = {
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
export class OfferRepository {
  async create(prisma: any, data: any) {
    const offer = await prisma.offer.create({
      data,
      include: OFFER_INCLUDE,
    });
    const usersMap = await fetchUsersMap(prisma, [offer.createdById]);
    return this.serializeOffer(offer, usersMap);
  }

  async findById(prisma: any, id: string) {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: OFFER_INCLUDE,
    });
    if (!offer) return null;

    const usersMap = await fetchUsersMap(prisma, [offer.createdById]);
    return this.serializeOffer(offer, usersMap);
  }

  async list(prisma: any, tenantId: string, filters: any = {}) {
    const { page = 1, limit = 20, applicationId, status } = filters;
    const where: any = { tenantId };

    if (applicationId) where.applicationId = applicationId;
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: OFFER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.offer.count({ where }),
    ]);

    const usersMap = await fetchUsersMap(prisma, offers.map((o: any) => o.createdById));
    const items = offers.map((offer: any) => this.serializeOffer(offer, usersMap));

    return { items, total, page, limit };
  }

  async update(prisma: any, id: string, data: any) {
    const offer = await prisma.offer.update({
      where: { id },
      data,
      include: OFFER_INCLUDE,
    });
    const usersMap = await fetchUsersMap(prisma, [offer.createdById]);
    return this.serializeOffer(offer, usersMap);
  }

  async delete(prisma: any, id: string) {
    return prisma.offer.delete({
      where: { id },
    });
  }

  async findByApplication(prisma: any, applicationId: string) {
    return prisma.offer.findFirst({
      where: { applicationId },
      include: OFFER_INCLUDE,
    });
  }

  async findAcceptedOffers(prisma: any, tenantId: string) {
    return prisma.offer.findMany({
      where: {
        tenantId,
        status: 'ACCEPTED',
        application: {
          stage: 'OFFERED'
        }
      },
      include: OFFER_INCLUDE,
    });
  }

  private serializeOffer(offer: any, usersMap: UsersMap) {
    return {
      ...offer,
      creator: toUserOrNull(offer.createdById, usersMap),
    };
  }
}
