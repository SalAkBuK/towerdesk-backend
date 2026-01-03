import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BuildingAssignmentType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BuildingsRepo } from '../buildings/buildings.repo';
import { UsersRepo } from '../users/users.repo';
import { CreateBuildingAssignmentDto } from './dto/create-building-assignment.dto';
import { BuildingAssignmentsRepo } from './building-assignments.repo';

@Injectable()
export class BuildingAssignmentsService {
  constructor(
    private readonly buildingsRepo: BuildingsRepo,
    private readonly usersRepo: UsersRepo,
    private readonly assignmentsRepo: BuildingAssignmentsRepo,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    dto: CreateBuildingAssignmentDto,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const targetUser = await this.usersRepo.findById(dto.userId);
    if (!targetUser || !targetUser.isActive || targetUser.orgId !== orgId) {
      throw new BadRequestException('User not in org');
    }

    try {
      const assignment = await this.assignmentsRepo.create(
        buildingId,
        targetUser.id,
        dto.type,
      );
      await this.ensureAdminRoleForBuildingAdminAssignment(
        targetUser.id,
        dto.type,
      );
      return assignment;
    } catch (error: unknown) {
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: string }).code
            : undefined;
      if (code === 'P2002') {
        throw new ConflictException('Assignment already exists');
      }
      throw error;
    }
  }

  async list(user: AuthenticatedUser | undefined, buildingId: string) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.assignmentsRepo.listByBuilding(buildingId);
  }

  private async ensureAdminRoleForBuildingAdminAssignment(
    userId: string,
    type: BuildingAssignmentType,
  ) {
    if (type !== BuildingAssignmentType.BUILDING_ADMIN) {
      return;
    }

    const adminRole = await this.prisma.role.findUnique({
      where: { key: 'admin' },
    });
    if (!adminRole) {
      throw new BadRequestException('admin role not configured');
    }

    await this.prisma.userRole.createMany({
      data: [{ userId, roleId: adminRole.id }],
      skipDuplicates: true,
    });
  }
}
