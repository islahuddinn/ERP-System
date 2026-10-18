import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto, userId?: string) {
    // Check if vendor with same name exists
    const existingVendor = await this.prisma.vendor.findFirst({
      where: { name: createVendorDto.name }
    });

    if (existingVendor) {
      throw new BadRequestException(`Vendor ${createVendorDto.name} already exists`);
    }

    return this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        createdById: userId || null
      }
    });
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        bills: true,
        payments: true
      }
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: Partial<CreateVendorDto>) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id }
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto
    });
  }

  async remove(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id }
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
