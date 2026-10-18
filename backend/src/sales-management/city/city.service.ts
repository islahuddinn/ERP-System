import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { ZoneService } from "../zone/zone.service";
import { CityRepository } from "./city.repository";
import { CityDetail, CityListItem, CityTree } from "./utils/types";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { CityFiltersDto } from "./dto/city-filters.dto";

@Injectable()
export class CityService {
  constructor(
    private readonly cityRepository: CityRepository,
    private readonly zoneService: ZoneService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listCities(cityFiltersDto: CityFiltersDto): Promise<PaginatedResponse<CityListItem>> {
    return this.cityRepository.findAll(cityFiltersDto);
  }

  async dropdown(zoneId?: string): Promise<{ id: string; name: string; zoneId: string }[]> {
    return this.cityRepository.dropdown(zoneId);
  }

  async getCity(cityId: string): Promise<CityDetail> {
    return this.checkExistence(cityId);
  }

  async createCity(createCityDto: CreateCityDto): Promise<CityDetail> {
    const { name, zoneId, status } = createCityDto;

    await this.zoneService.checkExistence(zoneId);

    const payload: Prisma.CityCreateInput = {
      name,
      zone: { connect: { id: zoneId } },
      ...(status && { status }),
    };

    try {
      return await this.cityRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A city with this name already exists in this zone");
    }
  }

  async updateCity(cityId: string, updateCityDto: UpdateCityDto): Promise<CityDetail> {
    const existingCity = await this.checkExistence(cityId);

    this.auditContext.setOldValue(existingCity);
    this.auditContext.setEntityLabel(existingCity.name);

    const { name, zoneId, status } = updateCityDto;

    if (zoneId) {
      await this.zoneService.checkExistence(zoneId);
    }

    const updateData: Prisma.CityUpdateInput = {
      ...(name !== undefined && { name }),
      ...(zoneId !== undefined && { zone: { connect: { id: zoneId } } }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.cityRepository.update(cityId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A city with this name already exists in this zone");
    }
  }

  async deleteCity(cityId: string): Promise<void> {
    const existingCity = await this.checkExistence(cityId);

    if (await this.cityRepository.hasBranches(cityId)) {
      throw new BadRequestException("Cannot delete a city that has branches assigned to it");
    }

    this.auditContext.setOldValue(existingCity);
    this.auditContext.setEntityLabel(existingCity.name);

    await this.cityRepository.delete(cityId);
  }

  async getCityTree(cityId: string): Promise<CityTree> {
    await this.checkExistence(cityId);
    const cityTree = await this.cityRepository.findTreeById(cityId);
    return cityTree as CityTree;
  }

  async checkExistence(cityId: string): Promise<CityDetail> {
    const city = await this.cityRepository.findById(cityId);

    if (!city) {
      throw new NotFoundException("City not found");
    }

    return city;
  }
}
