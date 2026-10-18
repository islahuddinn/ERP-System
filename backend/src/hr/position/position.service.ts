import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { PositionRepository } from "./position.repository";
import { PositionDetail, PositionWithEmployeeCount } from "./utils/types";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";
import { PositionFiltersDto } from "./dto/position-filters.dto";

@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listPositions(
    positionFiltersDto: PositionFiltersDto,
  ): Promise<PaginatedResponse<PositionWithEmployeeCount>> {
    return this.positionRepository.findAll(positionFiltersDto);
  }

  async dropdown(): Promise<{ id: string; title: string }[]> {
    return this.positionRepository.dropdown();
  }

  async getPosition(positionId: string): Promise<PositionDetail> {
    return this.checkExistence(positionId);
  }

  async createPosition(createPositionDto: CreatePositionDto): Promise<PositionDetail> {
    const { title, description } = createPositionDto;

    try {
      return await this.positionRepository.create({
        title,
        description: description ?? null,
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A position with this title already exists");
    }
  }

  async updatePosition(
    positionId: string,
    updatePositionDto: UpdatePositionDto,
  ): Promise<PositionDetail> {
    const existingPosition = await this.checkExistence(positionId);

    this.auditContext.setOldValue(existingPosition);
    this.auditContext.setEntityLabel(existingPosition.title);

    const { title, description } = updatePositionDto;

    try {
      return await this.positionRepository.update(positionId, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      });
    } catch (error) {
      handlePrismaUniqueError(error, "A position with this title already exists");
    }
  }

  async deletePosition(positionId: string): Promise<{ message: string }> {
    const existingPosition = await this.checkExistence(positionId);

    if (await this.positionRepository.hasEmployees(positionId)) {
      throw new BadRequestException("Cannot delete a position that has employees assigned to it");
    }

    this.auditContext.setOldValue(existingPosition);
    this.auditContext.setEntityLabel(existingPosition.title);

    await this.positionRepository.delete(positionId);

    return { message: "Position deleted successfully" };
  }

  async checkExistence(positionId: string): Promise<PositionDetail> {
    const position = await this.positionRepository.findById(positionId);
    if (!position) throw new NotFoundException("Position not found");
    return position;
  }
}
