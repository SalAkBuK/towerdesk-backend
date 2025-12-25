import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UnitBridgeStatus } from '@prisma/client';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitBridgeResponseDto, toUnitBridgeResponse } from './dto/unit.response.dto';
import { UnitsBridgeRepo } from './units.repo';
import { normalizeUnitNumber } from './utils/unit-normalization';
import { PaginationQueryDto } from '../../common/dto/pagination.query.dto';
import { resolvePagination } from '../../common/utils/pagination';

@Injectable()
export class UnitsBridgeService {
  constructor(private readonly unitsRepo: UnitsBridgeRepo) {}

  async createUnit(dto: CreateUnitDto): Promise<UnitBridgeResponseDto> {
    const unitNumberNorm = normalizeUnitNumber(dto.unitNumber);
    const existingBuilding = await this.unitsRepo.findBuilding(dto.legacyBuildingId);

    if (!existingBuilding) {
      if (!dto.buildingName || dto.buildingName.trim().length === 0) {
        throw new BadRequestException('buildingName is required for new buildings');
      }
      await this.unitsRepo.createBuilding({
        legacyBuildingId: dto.legacyBuildingId,
        legacyAdminId: dto.legacyAdminId,
        buildingName: dto.buildingName.trim(),
      });
    } else if (existingBuilding.legacyAdminId !== dto.legacyAdminId) {
      throw new ConflictException('Building belongs to a different legacy admin');
    }

    const existingUnit = await this.unitsRepo.findUnitByNumber(
      dto.legacyBuildingId,
      unitNumberNorm,
    );
    if (existingUnit) {
      throw new ConflictException('Unit already exists for this building');
    }

    const ownerFields =
      dto.ownershipType === 'building'
        ? {
            ownerName: null,
            ownerCnicOrId: null,
            ownerContactNumber: null,
          }
        : {
            ownerName: dto.ownerName ?? null,
            ownerCnicOrId: dto.ownerCnicOrId ?? null,
            ownerContactNumber: dto.ownerContactNumber ?? null,
          };

    const unit = await this.unitsRepo.createUnit({
      legacyBuildingId: dto.legacyBuildingId,
      unitNumberRaw: dto.unitNumber,
      unitNumberNorm,
      unitType: dto.unitType,
      floorNumber: dto.floorNumber,
      ownershipType: dto.ownershipType,
      furnished: dto.furnished ?? null,
      areaSize: dto.areaSize ?? null,
      areaUnit: dto.areaUnit ?? null,
      numberOfRooms: dto.numberOfRooms ?? null,
      numberOfBedrooms: dto.numberOfBedrooms ?? null,
      numberOfBathrooms: dto.numberOfBathrooms ?? null,
      kitchen: dto.kitchen ?? null,
      balcony: dto.balcony ?? null,
      ...ownerFields,
      electricityMeterNumber: dto.electricityMeterNumber ?? null,
      gasMeterNumber: dto.gasMeterNumber ?? null,
      waterConnectionType: dto.waterConnectionType ?? null,
      monthlyRent: dto.monthlyRent ?? null,
      maintenanceCharges: dto.maintenanceCharges ?? null,
      securityDeposit: dto.securityDeposit ?? null,
      currency: dto.currency ?? undefined,
      parkingSlotNumber: dto.parkingSlotNumber ?? null,
      parkingType: dto.parkingType ?? null,
      status: UnitBridgeStatus.AVAILABLE,
    });

    return toUnitBridgeResponse(unit);
  }

  async listByAdmin(
    legacyAdminId: number,
    pagination: PaginationQueryDto,
  ): Promise<UnitBridgeResponseDto[]> {
    const { take, skip } = resolvePagination(pagination.limit, pagination.offset);
    const units = await this.unitsRepo.listUnitsByAdmin(legacyAdminId, {
      take,
      skip,
    });
    return units.map(toUnitBridgeResponse);
  }

  async listByBuilding(
    legacyBuildingId: number,
    pagination: PaginationQueryDto,
  ): Promise<UnitBridgeResponseDto[]> {
    const { take, skip } = resolvePagination(pagination.limit, pagination.offset);
    const units = await this.unitsRepo.listUnitsByBuilding(legacyBuildingId, {
      take,
      skip,
    });
    return units.map(toUnitBridgeResponse);
  }

  async updateUnit(unitId: string, dto: UpdateUnitDto): Promise<UnitBridgeResponseDto> {
    const existing = await this.unitsRepo.findUnitById(unitId);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }

    const updateData: Prisma.UnitBridgeUpdateInput = {};

    if (dto.unitNumber !== undefined) {
      const unitNumberNorm = normalizeUnitNumber(dto.unitNumber);
      const duplicate = await this.unitsRepo.findUnitByNumber(
        existing.legacyBuildingId,
        unitNumberNorm,
      );
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictException('Unit already exists for this building');
      }
      updateData.unitNumberRaw = dto.unitNumber;
      updateData.unitNumberNorm = unitNumberNorm;
    }

    if (dto.unitType !== undefined) {
      updateData.unitType = dto.unitType;
    }
    if (dto.floorNumber !== undefined) {
      updateData.floorNumber = dto.floorNumber;
    }

    const effectiveOwnershipType = dto.ownershipType ?? existing.ownershipType;
    if (dto.ownershipType !== undefined) {
      updateData.ownershipType = dto.ownershipType;
    }

    if (dto.furnished !== undefined) {
      updateData.furnished = dto.furnished;
    }
    if (dto.areaSize !== undefined) {
      updateData.areaSize = dto.areaSize;
    }
    if (dto.areaUnit !== undefined) {
      updateData.areaUnit = dto.areaUnit;
    }
    if (dto.numberOfRooms !== undefined) {
      updateData.numberOfRooms = dto.numberOfRooms;
    }
    if (dto.numberOfBedrooms !== undefined) {
      updateData.numberOfBedrooms = dto.numberOfBedrooms;
    }
    if (dto.numberOfBathrooms !== undefined) {
      updateData.numberOfBathrooms = dto.numberOfBathrooms;
    }
    if (dto.kitchen !== undefined) {
      updateData.kitchen = dto.kitchen;
    }
    if (dto.balcony !== undefined) {
      updateData.balcony = dto.balcony;
    }

    if (effectiveOwnershipType === 'building') {
      updateData.ownerName = null;
      updateData.ownerCnicOrId = null;
      updateData.ownerContactNumber = null;
    } else {
      if (dto.ownerName !== undefined) {
        updateData.ownerName = dto.ownerName;
      }
      if (dto.ownerCnicOrId !== undefined) {
        updateData.ownerCnicOrId = dto.ownerCnicOrId;
      }
      if (dto.ownerContactNumber !== undefined) {
        updateData.ownerContactNumber = dto.ownerContactNumber;
      }
    }

    if (dto.electricityMeterNumber !== undefined) {
      updateData.electricityMeterNumber = dto.electricityMeterNumber;
    }
    if (dto.gasMeterNumber !== undefined) {
      updateData.gasMeterNumber = dto.gasMeterNumber;
    }
    if (dto.waterConnectionType !== undefined) {
      updateData.waterConnectionType = dto.waterConnectionType;
    }
    if (dto.monthlyRent !== undefined) {
      updateData.monthlyRent = dto.monthlyRent;
    }
    if (dto.maintenanceCharges !== undefined) {
      updateData.maintenanceCharges = dto.maintenanceCharges;
    }
    if (dto.securityDeposit !== undefined) {
      updateData.securityDeposit = dto.securityDeposit;
    }
    if (dto.currency !== undefined && dto.currency !== null) {
      updateData.currency = dto.currency;
    }
    if (dto.parkingSlotNumber !== undefined) {
      updateData.parkingSlotNumber = dto.parkingSlotNumber;
    }
    if (dto.parkingType !== undefined) {
      updateData.parkingType = dto.parkingType;
    }

    const updated = await this.unitsRepo.updateUnit(unitId, updateData);
    return toUnitBridgeResponse(updated);
  }
}
