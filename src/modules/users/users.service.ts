import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UsersRepo } from './users.repo';
import { toUserResponse } from './dto/user.response.dto';
import { CreateOrgUserDto } from './dto/create-org-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepo,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const roleKeys = await this.usersRepo.getRoleKeys(user.id);
    return toUserResponse(user, roleKeys);
  }

  async listMyAssignments(user: AuthenticatedUser | undefined) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.prisma.buildingAssignment.findMany({
      where: {
        userId,
        building: { orgId },
      },
      select: {
        buildingId: true,
        type: true,
        building: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).then((assignments) =>
      assignments.map((assignment) => ({
        buildingId: assignment.buildingId,
        buildingName: assignment.building.name,
        type: assignment.type,
      })),
    );
  }

  async listInOrg(user: AuthenticatedUser | undefined) {
    const orgId = assertOrgScope(user);
    const users = await this.usersRepo.listByOrg(orgId);
    const responses = [];
    for (const orgUser of users) {
      const embeddedRoles = (orgUser as { userRoles?: { role: { key: string } }[] })
        .userRoles;
      if (embeddedRoles) {
        responses.push(
          toUserResponse(
            orgUser,
            embeddedRoles.map((entry) => entry.role.key),
          ),
        );
        continue;
      }
      const roleKeys = await this.usersRepo.getRoleKeys(orgUser.id);
      responses.push(toUserResponse(orgUser, roleKeys));
    }
    return responses;
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string; phone?: string }) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.usersRepo.updateProfile(id, data);
    const roleKeys = await this.usersRepo.getRoleKeys(id);
    return toUserResponse(updated, roleKeys);
  }

  async createInOrg(
    user: AuthenticatedUser | undefined,
    dto: CreateOrgUserDto,
  ) {
    const orgId = assertOrgScope(user);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    if (dto.roleKeys?.includes('super_admin')) {
      throw new BadRequestException('super_admin role cannot be assigned');
    }

    const tempPassword = dto.password ?? this.generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword);
    const roleKeys = dto.roleKeys?.length ? Array.from(new Set(dto.roleKeys)) : [];

    const created = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          orgId,
          mustChangePassword: true,
        },
      });

      if (roleKeys.length > 0) {
        const roles = await tx.role.findMany({
          where: { key: { in: roleKeys } },
        });
        if (roles.length !== roleKeys.length) {
          throw new BadRequestException('Unknown role key provided');
        }

        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: createdUser.id,
            roleId: role.id,
          })),
          skipDuplicates: true,
        });
      }

      return createdUser;
    });

    return {
      userId: created.id,
      email: created.email,
      tempPassword: dto.password ? undefined : tempPassword,
      mustChangePassword: true,
    };
  }

  private generateTempPassword() {
    return randomBytes(12).toString('base64url');
  }
}
