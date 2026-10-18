import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { CustomerCategoryRepository } from "./customer-category.repository";
import { CustomerCategoryDetail, CustomerCategoryListItem } from "./utils/types";
import { CreateCustomerCategoryDto } from "./dto/create-customer-category.dto";
import { UpdateCustomerCategoryDto } from "./dto/update-customer-category.dto";
import { CustomerCategoryFiltersDto } from "./dto/customer-category-filters.dto";

@Injectable()
export class CustomerCategoryService {
  constructor(
    private readonly customerCategoryRepository: CustomerCategoryRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listCustomerCategories(
    customerCategoryFiltersDto: CustomerCategoryFiltersDto,
  ): Promise<PaginatedResponse<CustomerCategoryListItem>> {
    return this.customerCategoryRepository.findAll(customerCategoryFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.customerCategoryRepository.dropdown();
  }

  async getCustomerCategory(customerCategoryId: string): Promise<CustomerCategoryDetail> {
    return this.checkExistence(customerCategoryId);
  }

  async createCustomerCategory(
    createCustomerCategoryDto: CreateCustomerCategoryDto,
  ): Promise<CustomerCategoryDetail> {
    const { name, status } = createCustomerCategoryDto;

    const payload: Prisma.CustomerCategoryCreateInput = {
      name,
      ...(status && { status }),
    };

    try {
      return await this.customerCategoryRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A customer category with this name already exists");
    }
  }

  async updateCustomerCategory(
    customerCategoryId: string,
    updateCustomerCategoryDto: UpdateCustomerCategoryDto,
  ): Promise<CustomerCategoryDetail> {
    const existingCustomerCategory = await this.checkExistence(customerCategoryId);

    this.auditContext.setOldValue(existingCustomerCategory);
    this.auditContext.setEntityLabel(existingCustomerCategory.name);

    const { name, status } = updateCustomerCategoryDto;

    const updateData: Prisma.CustomerCategoryUpdateInput = {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
    };

    try {
      return await this.customerCategoryRepository.update(customerCategoryId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A customer category with this name already exists");
    }
  }

  async deleteCustomerCategory(customerCategoryId: string): Promise<void> {
    const existingCustomerCategory = await this.checkExistence(customerCategoryId);

    const isReferencedByCustomers =
      await this.customerCategoryRepository.hasCustomersReferencing(customerCategoryId);
    if (isReferencedByCustomers) {
      throw new BadRequestException(
        `Cannot delete customer category "${existingCustomerCategory.name}" — it is assigned to one or more customers`,
      );
    }

    this.auditContext.setOldValue(existingCustomerCategory);
    this.auditContext.setEntityLabel(existingCustomerCategory.name);

    await this.customerCategoryRepository.delete(customerCategoryId);
  }

  async checkExistence(customerCategoryId: string): Promise<CustomerCategoryDetail> {
    const customerCategory = await this.customerCategoryRepository.findById(customerCategoryId);

    if (!customerCategory) {
      throw new NotFoundException("Customer category not found");
    }

    return customerCategory;
  }
}
