import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OccupancyBridgeResponseDto, toOccupancyResponse } from './dto/occupancy.response.dto';
import { AssignOccupancyDto } from './dto/assign-occupancy.dto';
import { UnassignOccupancyDto } from './dto/unassign-occupancy.dto';
import { OccupancyBridgeRepo } from './occupancy.repo';
import { normalizeUnitNumber } from './utils/unit-normalization';
import { PaginationQueryDto } from '../../common/dto/pagination.query.dto';
import { resolvePagination } from '../../common/utils/pagination';

@Injectable()
export class OccupancyBridgeService {
  constructor(private readonly occupancyRepo: OccupancyBridgeRepo) {}

  async assign(dto: AssignOccupancyDto): Promise<OccupancyBridgeResponseDto> {
    const unitNumberNorm = normalizeUnitNumber(dto.unitNumber);
    const unit = await this.occupancyRepo.findUnitByNumber(
      dto.legacyBuildingId,
      unitNumberNorm,
    );
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const result = await this.occupancyRepo.assignOccupancy({
      unitId: unit.id,
      legacyTenantId: dto.legacyTenantId,
      startDate: dto.startDate ?? new Date(),
    });

    if (result.status === 'tenant-occupied') {
      throw new ConflictException('Tenant already occupies another unit');
    }
    if (result.status === 'unit-occupied') {
      throw new ConflictException('Unit is already occupied');
    }
    if (result.status === 'missing-unit') {
      throw new NotFoundException('Unit not found');
    }

    return toOccupancyResponse(result.occupancy);
  }

  async unassign(
    dto: UnassignOccupancyDto,
  ): Promise<OccupancyBridgeResponseDto> {
    const result = await this.occupancyRepo.unassignOccupancy({
      legacyTenantId: dto.legacyTenantId,
      endDate: dto.endDate ?? new Date(),
    });

    if (result.status === 'not-found') {
      throw new NotFoundException('Active occupancy not found');
    }

    return toOccupancyResponse(result.occupancy);
  }

  async listByTenant(
    legacyTenantId: number,
    pagination: PaginationQueryDto,
  ): Promise<OccupancyBridgeResponseDto[]> {
    const { take, skip } = resolvePagination(pagination.limit, pagination.offset);
    const records = await this.occupancyRepo.listOccupanciesByTenant(
      legacyTenantId,
      { take, skip },
    );
    return records.map(toOccupancyResponse);
  }
}
