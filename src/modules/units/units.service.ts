import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { BuildingsRepo } from '../buildings/buildings.repo';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UnitsRepo } from './units.repo';

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitsRepo: UnitsRepo,
    private readonly buildingsRepo: BuildingsRepo,
    private readonly prisma: PrismaService,
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
      await this.assertUnitTypeInOrg(orgId, dto.unitTypeId);
      await this.assertOwnerInOrg(orgId, dto.ownerId);
      const amenityIds =
        dto.amenityIds === undefined
          ? await this.getDefaultAmenityIds(buildingId)
          : dto.amenityIds;
      await this.assertAmenityIds(buildingId, amenityIds);

      const createdUnit = await this.prisma.$transaction(async (tx) => {
        const unit = await tx.unit.create({
          data: {
            buildingId,
            ...this.mapUnitData(dto),
          },
        });

        if (amenityIds.length > 0) {
          await tx.unitAmenity.createMany({
            data: amenityIds.map((amenityId) => ({
              unitId: unit.id,
              amenityId,
            })),
            skipDuplicates: true,
          });
        }

        return unit;
      });

      return createdUnit;
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

  async findById(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    unitId: string,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const unit = await this.unitsRepo.findByIdForBuildingWithAmenities(
      buildingId,
      unitId,
    );
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async update(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    unitId: string,
    dto: UpdateUnitDto,
  ) {
    const orgId = assertOrgScope(user);
    const building = await this.buildingsRepo.findByIdForOrg(orgId, buildingId);
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const unit = await this.unitsRepo.findByIdForBuilding(buildingId, unitId);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    try {
      await this.assertUnitTypeInOrg(orgId, dto.unitTypeId);
      await this.assertOwnerInOrg(orgId, dto.ownerId);
      if (dto.amenityIds !== undefined) {
        await this.assertAmenityIds(buildingId, dto.amenityIds);
      }

      const data = this.mapUnitUpdate(dto);
      await this.prisma.$transaction(async (tx) => {
        const unitRecord =
          Object.keys(data).length > 0
            ? await tx.unit.update({
                where: { id: unit.id },
                data,
              })
            : await tx.unit.findUnique({ where: { id: unit.id } });

        if (!unitRecord) {
          throw new NotFoundException('Unit not found');
        }

        if (dto.amenityIds !== undefined) {
          await tx.unitAmenity.deleteMany({
            where: { unitId: unit.id },
          });
          if (dto.amenityIds.length > 0) {
            await tx.unitAmenity.createMany({
              data: dto.amenityIds.map((amenityId) => ({
                unitId: unit.id,
                amenityId,
              })),
              skipDuplicates: true,
            });
          }
        }

        return unitRecord;
      });

      const updated = await this.unitsRepo.findByIdForBuildingWithAmenities(
        buildingId,
        unit.id,
      );
      if (!updated) {
        throw new NotFoundException('Unit not found');
      }
      return updated;
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

  private async assertUnitTypeInOrg(orgId: string, unitTypeId?: string) {
    if (!unitTypeId) {
      return;
    }
    const unitType = await this.prisma.unitType.findFirst({
      where: { id: unitTypeId, orgId },
    });
    if (!unitType) {
      throw new NotFoundException('Unit type not found');
    }
  }

  private async assertOwnerInOrg(orgId: string, ownerId?: string) {
    if (!ownerId) {
      return;
    }
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, orgId },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
  }

  private async getDefaultAmenityIds(buildingId: string) {
    const amenities = await this.prisma.buildingAmenity.findMany({
      where: { buildingId, isActive: true, isDefault: true },
      select: { id: true },
    });
    return amenities.map((amenity) => amenity.id);
  }

  private async assertAmenityIds(buildingId: string, amenityIds: string[]) {
    if (amenityIds.length === 0) {
      return;
    }
    const amenities = await this.prisma.buildingAmenity.findMany({
      where: {
        buildingId,
        isActive: true,
        id: { in: amenityIds },
      },
      select: { id: true },
    });
    if (amenities.length !== amenityIds.length) {
      throw new BadRequestException(
        'Amenity does not belong to the same building as the unit',
      );
    }
  }

  private mapUnitData(dto: CreateUnitDto) {
    return {
      label: dto.label,
      floor: dto.floor,
      notes: dto.notes,
      unitTypeId: dto.unitTypeId,
      ownerId: dto.ownerId,
      maintenancePayer: dto.maintenancePayer,
      unitSize: dto.unitSize !== undefined ? new Prisma.Decimal(dto.unitSize) : undefined,
      unitSizeUnit: dto.unitSizeUnit,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      balcony: dto.balcony,
      kitchenType: dto.kitchenType,
      furnishedStatus: dto.furnishedStatus,
      rentAnnual: dto.rentAnnual !== undefined ? new Prisma.Decimal(dto.rentAnnual) : undefined,
      paymentFrequency: dto.paymentFrequency,
      securityDepositAmount:
        dto.securityDepositAmount !== undefined
          ? new Prisma.Decimal(dto.securityDepositAmount)
          : undefined,
      serviceChargePerUnit:
        dto.serviceChargePerUnit !== undefined
          ? new Prisma.Decimal(dto.serviceChargePerUnit)
          : undefined,
      vatApplicable: dto.vatApplicable,
      electricityMeterNumber: dto.electricityMeterNumber,
      waterMeterNumber: dto.waterMeterNumber,
      gasMeterNumber: dto.gasMeterNumber,
    };
  }

  private mapUnitUpdate(dto: UpdateUnitDto): Prisma.UnitUpdateInput {
    const data: Prisma.UnitUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.unitTypeId !== undefined) {
      data.unitType = dto.unitTypeId
        ? { connect: { id: dto.unitTypeId } }
        : { disconnect: true };
    }
    if (dto.ownerId !== undefined) {
      data.owner = dto.ownerId
        ? { connect: { id: dto.ownerId } }
        : { disconnect: true };
    }
    if (dto.maintenancePayer !== undefined) data.maintenancePayer = dto.maintenancePayer;
    if (dto.unitSize !== undefined) data.unitSize = new Prisma.Decimal(dto.unitSize);
    if (dto.unitSizeUnit !== undefined) data.unitSizeUnit = dto.unitSizeUnit;
    if (dto.bedrooms !== undefined) data.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) data.bathrooms = dto.bathrooms;
    if (dto.balcony !== undefined) data.balcony = dto.balcony;
    if (dto.kitchenType !== undefined) data.kitchenType = dto.kitchenType;
    if (dto.furnishedStatus !== undefined) data.furnishedStatus = dto.furnishedStatus;
    if (dto.rentAnnual !== undefined) data.rentAnnual = new Prisma.Decimal(dto.rentAnnual);
    if (dto.paymentFrequency !== undefined) data.paymentFrequency = dto.paymentFrequency;
    if (dto.securityDepositAmount !== undefined) {
      data.securityDepositAmount = new Prisma.Decimal(dto.securityDepositAmount);
    }
    if (dto.serviceChargePerUnit !== undefined) {
      data.serviceChargePerUnit = new Prisma.Decimal(dto.serviceChargePerUnit);
    }
    if (dto.vatApplicable !== undefined) data.vatApplicable = dto.vatApplicable;
    if (dto.electricityMeterNumber !== undefined) {
      data.electricityMeterNumber = dto.electricityMeterNumber;
    }
    if (dto.waterMeterNumber !== undefined) {
      data.waterMeterNumber = dto.waterMeterNumber;
    }
    if (dto.gasMeterNumber !== undefined) {
      data.gasMeterNumber = dto.gasMeterNumber;
    }
    return data;
  }
}
