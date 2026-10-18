import { Injectable, NotFoundException } from "@nestjs/common";
import { BrokerStatus, Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { RequestWithUser } from "../../common/interfaces";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { BrokerFiltersDto } from "./dto/broker-filters.dto";
import { BrokerRepository } from "./broker.repository";
import { BrokerDetail, BrokerListItem, BrokerPerformance } from "./utils/types";

@Injectable()
export class BrokerService {
  constructor(
    private readonly brokerRepository: BrokerRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listBrokers(brokerFiltersDto: BrokerFiltersDto): Promise<PaginatedResponse<BrokerListItem>> {
    return this.brokerRepository.findAll(brokerFiltersDto);
  }

  async getBroker(brokerId: string): Promise<BrokerDetail> {
    return this.checkExistence(brokerId);
  }

  async createBroker(createBrokerDto: CreateBrokerDto, req: RequestWithUser): Promise<BrokerDetail> {
    const { id: loggedInUserId } = req.user;
    const {
      name,
      brokerCode,
      contactPerson,
      phone,
      email,
      address,
      areaId,
      commissionRate,
      salesTarget,
      status,
    } = createBrokerDto;

    const payload: Prisma.BrokerCreateInput = {
      name,
      brokerCode: brokerCode || (await this.brokerRepository.generateBrokerCode()),
      contactPerson: contactPerson ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      areaId: areaId ?? null,
      commissionRate: commissionRate ?? 0,
      salesTarget: salesTarget ?? 0,
      createdById: loggedInUserId,
      ...(status && { status, isActive: status === BrokerStatus.ACTIVE }),
    };

    try {
      return await this.brokerRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A broker with this code already exists");
    }
  }

  async updateBroker(
    brokerId: string,
    updateBrokerDto: UpdateBrokerDto,
    req: RequestWithUser,
  ): Promise<BrokerDetail> {
    const { id: loggedInUserId } = req.user;
    const existingBroker = await this.checkExistence(brokerId);

    this.auditContext.setOldValue(existingBroker);
    this.auditContext.setEntityLabel(existingBroker.name);

    const {
      name,
      brokerCode,
      contactPerson,
      phone,
      email,
      address,
      areaId,
      commissionRate,
      salesTarget,
      status,
    } = updateBrokerDto;

    const updateData: Prisma.BrokerUpdateInput = {
      ...(name !== undefined && { name }),
      ...(brokerCode !== undefined && { brokerCode }),
      ...(contactPerson !== undefined && { contactPerson: contactPerson ?? null }),
      ...(phone !== undefined && { phone: phone ?? null }),
      ...(email !== undefined && { email: email ?? null }),
      ...(address !== undefined && { address: address ?? null }),
      ...(areaId !== undefined && { areaId: areaId ?? null }),
      ...(commissionRate !== undefined && { commissionRate }),
      ...(salesTarget !== undefined && { salesTarget }),
      ...(status !== undefined && { status, isActive: status === BrokerStatus.ACTIVE }),
      updatedById: loggedInUserId,
    };

    try {
      return await this.brokerRepository.update(brokerId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A broker with this code already exists");
    }
  }

  async deleteBroker(brokerId: string): Promise<void> {
    const existingBroker = await this.checkExistence(brokerId);

    this.auditContext.setOldValue(existingBroker);
    this.auditContext.setEntityLabel(existingBroker.name);

    await this.brokerRepository.softDelete(brokerId);
  }

  async listCommissions(): Promise<unknown[]> {
    // Sale records do not store brokerId, so there are no commission rows to list, approve, or pay.
    return [];
  }

  async suggestBrokers(): Promise<unknown[]> {
    return [];
  }

  async getBrokerPerformance(brokerId: string): Promise<BrokerPerformance> {
    const broker = await this.checkExistence(brokerId);
    const commissionRate = Number(broker.commissionRate ?? 0);
    const salesTarget = Number(broker.salesTarget ?? 0);

    return {
      broker: {
        id: broker.id,
        name: broker.name,
        brokerCode: broker.brokerCode,
        commissionRate,
        salesTarget,
      },
      totalSales: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      salesCount: 0,
      salesTarget,
      achievement: 0,
      salesAttributed: false,
      sales: [],
    };
  }

  async checkExistence(brokerId: string): Promise<BrokerDetail> {
    const broker = await this.brokerRepository.findById(brokerId);

    if (!broker) throw new NotFoundException("Broker not found");

    return broker;
  }
}
