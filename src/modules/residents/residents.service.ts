import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { BuildingsRepo } from '../buildings/buildings.repo';
import { UnitsRepo } from '../units/units.repo';
import { CreateResidentDto } from './dto/create-resident.dto';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingsRepo: BuildingsRepo,
    private readonly unitsRepo: UnitsRepo,
  ) {}

  async onboard(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    dto: CreateResidentDto,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const unit = await this.unitsRepo.findByIdForBuilding(buildingId, dto.unitId);
    if (!unit) {
      throw new BadRequestException('Unit not in building');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const tempPassword = dto.password ?? this.generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword);

    const residentUser = await this.prisma.$transaction(async (tx) => {
      const activeOccupancy = await tx.occupancy.findFirst({
        where: { unitId: unit.id, status: 'ACTIVE' },
      });
      if (activeOccupancy) {
        throw new ConflictException('Unit is already occupied');
      }

      const residentUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          passwordHash,
          orgId,
          mustChangePassword: true,
        },
      });

      const residentRole = await tx.role.findUnique({
        where: { key: 'resident' },
      });
      if (residentRole) {
        await tx.userRole.create({
          data: { userId: residentUser.id, roleId: residentRole.id },
        });
      }

      await tx.occupancy.create({
        data: {
          buildingId,
          unitId: unit.id,
          residentUserId: residentUser.id,
          status: 'ACTIVE',
        },
      });

      return residentUser;
    });

    return {
      userId: residentUser.id,
      name: residentUser.name ?? dto.name,
      email: residentUser.email,
      phone: residentUser.phone ?? null,
      unit: { id: unit.id, label: unit.label },
      buildingId,
      tempPassword: dto.password ? undefined : tempPassword,
      mustChangePassword: true,
    };
  }

  async list(user: AuthenticatedUser | undefined, buildingId: string) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.prisma.occupancy.findMany({
      where: { buildingId },
      include: {
        unit: true,
        residentUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentResidentProfile(user: AuthenticatedUser | undefined) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const residentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!residentUser || residentUser.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const occupancy = await this.prisma.occupancy.findFirst({
      where: {
        residentUserId: userId,
        status: 'ACTIVE',
        building: { orgId },
      },
      include: {
        building: true,
        unit: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { user: residentUser, occupancy };
  }

  private generateTempPassword() {
    return randomBytes(12).toString('base64url');
  }
}
