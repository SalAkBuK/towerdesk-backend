import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BuildingAssignmentType, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import {
  BuildingAssignmentGrantDto,
  ProvisionUserDto,
  ResidentGrantDto,
} from './dto/provision-user.dto';
import {
  ProvisionUserResponseDto,
  ProvisionedBuildingAssignmentDto,
  ProvisionedResidentDto,
} from './dto/provision-user.response.dto';

@Injectable()
export class OrgUsersProvisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async provision(
    user: AuthenticatedUser | undefined,
    dto: ProvisionUserDto,
  ): Promise<ProvisionUserResponseDto> {
    const orgId = assertOrgScope(user);
    const actorId = user?.sub;
    const normalizedEmail = this.normalizeEmail(dto.identity.email);
    const grants = dto.grants ?? {};
    const mode = dto.mode ?? {};

    const ifEmailExists = mode.ifEmailExists ?? 'LINK';
    const requireSameOrg = mode.requireSameOrg ?? true;
    const orgRoleKeys = this.dedupeStrings(grants.orgRoleKeys ?? []);
    const buildingAssignments = this.dedupeAssignments(
      grants.buildingAssignments ?? [],
    );
    const residentGrant = grants.resident;
    const hasUsersWrite = await this.hasUsersWritePermission(actorId);

    if (orgRoleKeys.includes('super_admin')) {
      throw new BadRequestException('super_admin role cannot be assigned');
    }

    return this.prisma.$transaction(async (tx) => {
      if (!hasUsersWrite) {
        if (!actorId) {
          throw new ForbiddenException('Unauthorized');
        }
        await this.assertManagerProvisioningAllowed(tx, {
          actorId,
          orgRoleKeys,
          buildingAssignments,
          residentGrant,
          requireSameOrg,
        });
      }

      let created = false;
      let linkedExisting = false;

      let targetUser = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (targetUser) {
        if (ifEmailExists === 'ERROR') {
          throw new ConflictException('Email already in use');
        }

        if (targetUser.orgId !== orgId) {
          if (!targetUser.orgId && !requireSameOrg) {
            targetUser = await tx.user.update({
              where: { id: targetUser.id },
              data: { orgId },
            });
          } else {
            throw new BadRequestException('User not in org');
          }
        }

        if (!targetUser.orgId) {
          throw new BadRequestException('User not in org');
        }

        if (!targetUser.isActive) {
          throw new BadRequestException('User not active');
        }

        linkedExisting = true;
      } else {
        const name = dto.identity.name?.trim();
        if (!name || name.length < 2) {
          throw new BadRequestException('Name required');
        }

        if (!dto.identity.password && !dto.identity.sendInvite) {
          throw new BadRequestException('Password or sendInvite required');
        }

        const password = dto.identity.password ?? this.generateTempPassword();
        const passwordHash = await argon2.hash(password);

        targetUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            name,
            passwordHash,
            orgId,
            mustChangePassword: true,
          },
        });

        created = true;
      }

      const appliedRoleKeys = await this.applyOrgRoles(
        tx,
        targetUser.id,
        orgRoleKeys,
      );
      const appliedAssignments = await this.applyBuildingAssignments(
        tx,
        orgId,
        targetUser.id,
        buildingAssignments,
      );
      await this.ensureAdminRoleForBuildingAdmins(
        tx,
        targetUser.id,
        buildingAssignments,
      );
      const appliedResident = await this.applyResidentGrant(
        tx,
        orgId,
        targetUser.id,
        residentGrant,
      );

      return {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name ?? null,
        },
        created,
        linkedExisting,
        applied: {
          orgRoleKeys: appliedRoleKeys,
          buildingAssignments: appliedAssignments,
          resident: appliedResident,
        },
      };
    });
  }

  private async hasUsersWritePermission(userId?: string) {
    if (!userId) {
      return false;
    }
    const effective =
      await this.accessControlService.getUserEffectivePermissions(userId);
    return effective.has('users.write');
  }

  private async assertManagerProvisioningAllowed(
    tx: Prisma.TransactionClient,
    params: {
      actorId: string;
      orgRoleKeys: string[];
      buildingAssignments: BuildingAssignmentGrantDto[];
      residentGrant?: ResidentGrantDto;
      requireSameOrg: boolean;
    },
  ) {
    if (!params.requireSameOrg) {
      throw new ForbiddenException('Managers must provision within their org');
    }

    if (params.orgRoleKeys.length > 0) {
      throw new ForbiddenException('Managers cannot assign org roles');
    }

    if (
      params.buildingAssignments.length === 0 &&
      !params.residentGrant
    ) {
      throw new ForbiddenException(
        'Managers must assign a building role or resident',
      );
    }

    const allowedTargetTypes = new Set<BuildingAssignmentType>([
      BuildingAssignmentType.MANAGER,
      BuildingAssignmentType.STAFF,
    ]);
    const invalidAssignment = params.buildingAssignments.find(
      (assignment) => !allowedTargetTypes.has(assignment.type),
    );
    if (invalidAssignment) {
      throw new ForbiddenException(
        'Managers can only assign MANAGER or STAFF building roles',
      );
    }

    const targetBuildingIds = new Set<string>();
    for (const assignment of params.buildingAssignments) {
      targetBuildingIds.add(assignment.buildingId);
    }
    if (params.residentGrant) {
      targetBuildingIds.add(params.residentGrant.buildingId);
    }

    if (targetBuildingIds.size === 0) {
      return;
    }

    const actorAssignments = await tx.buildingAssignment.findMany({
      where: {
        userId: params.actorId,
        buildingId: { in: Array.from(targetBuildingIds) },
        type: {
          in: [
            BuildingAssignmentType.MANAGER,
            BuildingAssignmentType.BUILDING_ADMIN,
          ],
        },
      },
    });
    const allowedBuildings = new Set(
      actorAssignments.map((assignment) => assignment.buildingId),
    );
    const missing = Array.from(targetBuildingIds).filter(
      (buildingId) => !allowedBuildings.has(buildingId),
    );
    if (missing.length > 0) {
      throw new ForbiddenException('Not assigned to target building');
    }
  }

  private async applyOrgRoles(
    tx: Prisma.TransactionClient,
    userId: string,
    roleKeys: string[],
  ): Promise<string[]> {
    if (roleKeys.length === 0) {
      return [];
    }

    const roles = await tx.role.findMany({
      where: { key: { in: roleKeys } },
    });

    const missing = roleKeys.filter(
      (key) => !roles.some((role) => role.key === key),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown role keys: ${missing.join(', ')}`,
      );
    }

    await tx.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id })),
      skipDuplicates: true,
    });

    return roles.map((role) => role.key);
  }

  private async applyBuildingAssignments(
    tx: Prisma.TransactionClient,
    orgId: string,
    userId: string,
    assignments: BuildingAssignmentGrantDto[],
  ): Promise<ProvisionedBuildingAssignmentDto[]> {
    const applied: ProvisionedBuildingAssignmentDto[] = [];

    for (const grant of assignments) {
      const building = await tx.building.findFirst({
        where: { id: grant.buildingId, orgId },
      });
      if (!building) {
        throw new NotFoundException('Building not found');
      }

      const assignment = await tx.buildingAssignment.upsert({
        where: {
          buildingId_userId_type: {
            buildingId: grant.buildingId,
            userId,
            type: grant.type,
          },
        },
        update: { type: grant.type },
        create: {
          buildingId: grant.buildingId,
          userId,
          type: grant.type,
        },
      });

      applied.push({
        id: assignment.id,
        buildingId: assignment.buildingId,
        type: assignment.type,
      });
    }

    return applied;
  }

  private async ensureAdminRoleForBuildingAdmins(
    tx: Prisma.TransactionClient,
    userId: string,
    assignments: BuildingAssignmentGrantDto[],
  ) {
    const hasBuildingAdmin = assignments.some(
      (assignment) => assignment.type === BuildingAssignmentType.BUILDING_ADMIN,
    );
    if (!hasBuildingAdmin) {
      return;
    }

    const adminRole = await tx.role.findUnique({ where: { key: 'admin' } });
    if (!adminRole) {
      throw new BadRequestException('admin role not configured');
    }

    await tx.userRole.createMany({
      data: [{ userId, roleId: adminRole.id }],
      skipDuplicates: true,
    });
  }

  private async applyResidentGrant(
    tx: Prisma.TransactionClient,
    orgId: string,
    userId: string,
    residentGrant?: ResidentGrantDto,
  ): Promise<ProvisionedResidentDto | null> {
    if (!residentGrant) {
      return null;
    }

    const building = await tx.building.findFirst({
      where: { id: residentGrant.buildingId, orgId },
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const unit = await tx.unit.findFirst({
      where: { id: residentGrant.unitId, buildingId: residentGrant.buildingId },
    });
    if (!unit) {
      throw new BadRequestException('Unit not in building');
    }

    await this.lockUnit(tx, unit.id);

    const existingForUnit = await tx.occupancy.findFirst({
      where: { unitId: unit.id, status: 'ACTIVE' },
    });

    if (existingForUnit && existingForUnit.residentUserId !== userId) {
      throw new ConflictException('Unit is already occupied');
    }

    const existingForUserUnit =
      existingForUnit && existingForUnit.residentUserId === userId
        ? existingForUnit
        : await tx.occupancy.findFirst({
            where: {
              unitId: unit.id,
              residentUserId: userId,
              status: 'ACTIVE',
            },
          });

    if (residentGrant.mode === 'MOVE') {
      await tx.occupancy.updateMany({
        where: {
          residentUserId: userId,
          buildingId: residentGrant.buildingId,
          status: 'ACTIVE',
          unitId: { not: unit.id },
        },
        data: {
          status: 'ENDED',
          endAt: new Date(),
        },
      });
    }

    const occupancy =
      existingForUserUnit ??
      (await tx.occupancy.create({
        data: {
          buildingId: residentGrant.buildingId,
          unitId: unit.id,
          residentUserId: userId,
          status: 'ACTIVE',
        },
      }));

    return {
      occupancyId: occupancy.id,
      unitId: occupancy.unitId,
      buildingId: occupancy.buildingId,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private generateTempPassword() {
    return randomBytes(12).toString('base64url');
  }

  private dedupeStrings(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim())));
  }

  private dedupeAssignments(assignments: BuildingAssignmentGrantDto[]) {
    const seen = new Set<string>();
    const deduped: BuildingAssignmentGrantDto[] = [];
    for (const assignment of assignments) {
      const key = `${assignment.buildingId}:${assignment.type}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(assignment);
    }
    return deduped;
  }

  private async lockUnit(tx: Prisma.TransactionClient, unitId: string) {
    await tx.$executeRaw`SELECT id FROM "Unit" WHERE id = ${unitId} FOR UPDATE`;
  }
}
