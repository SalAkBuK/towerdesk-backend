import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingAssignmentType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AccessControlService } from '../../modules/access-control/access-control.service';
import { AuthenticatedUser } from '../types/request-context';
import { assertOrgScope } from '../utils/org-scope';

type AccessOptions = {
  requiredPermissions?: string[];
  allowResident?: boolean;
  effectivePermissions?: Set<string>;
  allowManagerWrite?: boolean;
};

const assignmentPriority: BuildingAssignmentType[] = [
  BuildingAssignmentType.BUILDING_ADMIN,
  BuildingAssignmentType.MANAGER,
  BuildingAssignmentType.STAFF,
];

@Injectable()
export class BuildingAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async assertBuildingInOrg(buildingId: string, orgId: string) {
    if (!orgId) {
      throw new ForbiddenException('Org scope required');
    }

    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async getBuildingAssignmentType(buildingId: string, userId: string) {
    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { buildingId, userId },
    });
    if (assignments.length === 0) {
      return null;
    }

    for (const type of assignmentPriority) {
      if (assignments.some((assignment) => assignment.type === type)) {
        return type;
      }
    }

    return null;
  }

  async hasActiveOccupancy(buildingId: string, userId: string) {
    const occupancy = await this.prisma.occupancy.findFirst({
      where: {
        buildingId,
        residentUserId: userId,
        status: 'ACTIVE',
      },
    });
    return Boolean(occupancy);
  }

  async canReadBuildingResource(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    options: AccessOptions = {},
  ) {
    const orgId = assertOrgScope(user);
    await this.assertBuildingInOrg(buildingId, orgId);

    const userId = user?.sub;
    if (!userId) {
      return false;
    }

    if (await this.hasGlobalPermissions(userId, options)) {
      return true;
    }

    const assignment = await this.getBuildingAssignmentType(buildingId, userId);
    if (assignment) {
      return true;
    }

    if (options.allowResident) {
      return this.hasActiveOccupancy(buildingId, userId);
    }

    return false;
  }

  async canWriteBuildingResource(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    options: AccessOptions = {},
  ) {
    const orgId = assertOrgScope(user);
    await this.assertBuildingInOrg(buildingId, orgId);

    const userId = user?.sub;
    if (!userId) {
      return false;
    }

    if (await this.hasGlobalPermissions(userId, options)) {
      return true;
    }

    const assignment = await this.getBuildingAssignmentType(buildingId, userId);
    if (assignment === BuildingAssignmentType.BUILDING_ADMIN) {
      return true;
    }
    if (options.allowManagerWrite && assignment === BuildingAssignmentType.MANAGER) {
      return true;
    }
    return false;
  }

  private async hasGlobalPermissions(
    userId: string,
    options: AccessOptions,
  ): Promise<boolean> {
    const requiredPermissions = options.requiredPermissions ?? [];
    if (requiredPermissions.length === 0) {
      return false;
    }

    const effective =
      options.effectivePermissions ??
      (await this.accessControlService.getUserEffectivePermissions(userId));

    return requiredPermissions.every((permission) => effective.has(permission));
  }
}
