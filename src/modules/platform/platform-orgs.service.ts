import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { CreateOrgDto } from './dto/create-org.dto';

@Injectable()
export class PlatformOrgsService {
  constructor(private readonly prisma: PrismaService) {}

  listOrgs() {
    return this.prisma.org.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listOrgAdmins(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        orgId,
        userRoles: { some: { role: { key: 'org_admin' } } },
      },
      include: {
        org: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAllOrgAdmins() {
    return this.prisma.user.findMany({
      where: {
        orgId: { not: null },
        userRoles: { some: { role: { key: 'org_admin' } } },
      },
      include: {
        org: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOrgById(orgId: string) {
    return this.prisma.org.findUnique({ where: { id: orgId } });
  }

  create(dto: CreateOrgDto) {
    return this.prisma.org.create({
      data: {
        name: dto.name,
        businessName: dto.businessName,
        businessType: dto.businessType,
        tradeLicenseNumber: dto.tradeLicenseNumber,
        vatRegistrationNumber: dto.vatRegistrationNumber,
        registeredOfficeAddress: dto.registeredOfficeAddress,
        city: dto.city,
        officePhoneNumber: dto.officePhoneNumber,
        businessEmailAddress: dto.businessEmailAddress,
        website: dto.website,
        ownerName: dto.ownerName,
      },
    });
  }

  async createOrgAdmin(orgId: string, dto: CreateOrgAdminDto) {
    const org = await this.prisma.org.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Org not found');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const tempPassword = dto.password ?? this.generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        orgId,
        mustChangePassword: true,
      },
    });

    const role = await this.prisma.role.findUnique({
      where: { key: 'org_admin' },
    });
    if (!role) {
      throw new BadRequestException('ORG_ADMIN role not configured');
    }

    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      tempPassword: dto.password ? undefined : tempPassword,
      mustChangePassword: true,
    };
  }

  private generateTempPassword() {
    return randomBytes(12).toString('base64url');
  }
}
