import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { BuildingsRepo } from '../buildings/buildings.repo';
import { UnitsRepo } from '../units/units.repo';
import { UsersRepo } from '../users/users.repo';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import { OccupanciesRepo } from './occupancies.repo';

@Injectable()
export class OccupanciesService {
  constructor(
    private readonly buildingsRepo: BuildingsRepo,
    private readonly unitsRepo: UnitsRepo,
    private readonly usersRepo: UsersRepo,
    private readonly occupanciesRepo: OccupanciesRepo,
  ) {}

  async create(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    dto: CreateOccupancyDto,
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

    const resident = await this.usersRepo.findById(dto.residentUserId);
    if (!resident || !resident.isActive || resident.orgId !== orgId) {
      throw new BadRequestException('Resident not in org');
    }

    const created = await this.occupanciesRepo.createActiveIfVacant(
      buildingId,
      unit.id,
      resident.id,
    );
    if (!created) {
      throw new ConflictException('Unit is already occupied');
    }

    return created;
  }

  async list(user: AuthenticatedUser | undefined, buildingId: string) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.occupanciesRepo.listActiveByBuilding(buildingId);
  }

  async countActive(user: AuthenticatedUser | undefined, buildingId: string) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.occupanciesRepo.countActiveByBuilding(buildingId);
  }
}
