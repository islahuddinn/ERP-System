import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { CreateTransporterDto } from "./dto/create-transporter.dto";
import { UpdateTransporterDto } from "./dto/update-transporter.dto";
import { TransporterFiltersDto } from "./dto/transporter-filters.dto";
import { TransporterRepository } from "./transporter.repository";
import { TransporterDetail, TransporterListItem } from "./utils/types";

@Injectable()
export class TransporterService {
  constructor(
    private readonly transporterRepository: TransporterRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listTransporters(
    transporterFiltersDto: TransporterFiltersDto,
  ): Promise<PaginatedResponse<TransporterListItem>> {
    return this.transporterRepository.findAll(transporterFiltersDto);
  }

  async dropdown(): Promise<{ id: string; code: string; name: string; phone: string | null }[]> {
    return this.transporterRepository.dropdown();
  }

  async getTransporter(transporterId: string): Promise<TransporterDetail> {
    return this.checkExistence(transporterId);
  }

  async createTransporter(createTransporterDto: CreateTransporterDto): Promise<TransporterDetail> {
    const {
      code,
      name,
      contactName,
      phone,
      email,
      address,
      vehicleRegistration,
      notes,
      status,
    } = createTransporterDto;

    const payload: Prisma.TransporterCreateInput = {
      code,
      name,
      contactName: contactName ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      vehicleRegistration: vehicleRegistration ?? null,
      notes: notes ?? null,
      ...(status && { status }),
    };

    try {
      return await this.transporterRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A transporter with this code or name already exists");
    }
  }

  async updateTransporter(
    transporterId: string,
    updateTransporterDto: UpdateTransporterDto,
  ): Promise<TransporterDetail> {
    const existingTransporter = await this.checkExistence(transporterId);

    this.auditContext.setOldValue(existingTransporter);
    this.auditContext.setEntityLabel(existingTransporter.name);

    const {
      code,
      name,
      contactName,
      phone,
      email,
      address,
      vehicleRegistration,
      notes,
      status,
    } = updateTransporterDto;

    const updateData: Prisma.TransporterUpdateInput = {
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(contactName !== undefined && { contactName: contactName ?? null }),
      ...(phone !== undefined && { phone: phone ?? null }),
      ...(email !== undefined && { email: email ?? null }),
      ...(address !== undefined && { address: address ?? null }),
      ...(vehicleRegistration !== undefined && {
        vehicleRegistration: vehicleRegistration ?? null,
      }),
      ...(notes !== undefined && { notes: notes ?? null }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.transporterRepository.update(transporterId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A transporter with this code or name already exists");
    }
  }

  async deleteTransporter(transporterId: string): Promise<void> {
    const existingTransporter = await this.checkExistence(transporterId);

    this.auditContext.setOldValue(existingTransporter);
    this.auditContext.setEntityLabel(existingTransporter.name);

    await this.transporterRepository.delete(transporterId);
  }

  async checkExistence(transporterId: string): Promise<TransporterDetail> {
    const transporter = await this.transporterRepository.findById(transporterId);

    if (!transporter) {
      throw new NotFoundException("Transporter not found");
    }

    return transporter;
  }
}
