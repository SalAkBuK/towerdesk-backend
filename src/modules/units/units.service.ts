import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { BuildingsRepo } from '../buildings/buildings.repo';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitsRepo } from './units.repo';

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitsRepo: UnitsRepo,
    private readonly buildingsRepo: BuildingsRepo,
  ) {}

  async create(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    dto: CreateUnitDto,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    try {
      return await this.unitsRepo.create(buildingId, dto);
    } catch (error: unknown) {
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: string }).code
            : undefined;
      if (code === 'P2002') {
        throw new ConflictException('Unit label already exists');
      }
      throw error;
    }
  }

  async list(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    available?: boolean,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return this.unitsRepo.listByBuildingWithAvailability(
      buildingId,
      available === true,
    );
  }

  async countVacant(user: AuthenticatedUser | undefined, buildingId: string) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const [total, vacant] = await Promise.all([
      this.unitsRepo.countByBuilding(buildingId),
      this.unitsRepo.countVacantByBuilding(buildingId),
    ]);

    return { total, vacant };
  }
}
