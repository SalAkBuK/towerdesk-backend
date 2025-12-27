import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Unit } from '@prisma/client';

@Injectable()
export class UnitsRepo {
  constructor(private readonly prisma: PrismaService) {}

  create(
    buildingId: string,
    data: { label: string; floor?: number; notes?: string },
  ): Promise<Unit> {
    return this.prisma.unit.create({
      data: {
        buildingId,
        label: data.label,
        floor: data.floor,
        notes: data.notes,
      },
    });
  }

  listByBuilding(buildingId: string): Promise<Unit[]> {
    return this.listByBuildingWithAvailability(buildingId);
  }

  listByBuildingWithAvailability(
    buildingId: string,
    availableOnly?: boolean,
  ): Promise<Unit[]> {
    return this.prisma.unit.findMany({
      where: {
        buildingId,
        ...(availableOnly
          ? {
              occupancies: {
                none: { status: 'ACTIVE' },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countByBuilding(buildingId: string) {
    return this.prisma.unit.count({
      where: { buildingId },
    });
  }

  countVacantByBuilding(buildingId: string) {
    return this.prisma.unit.count({
      where: {
        buildingId,
        occupancies: {
          none: { status: 'ACTIVE' },
        },
      },
    });
  }

  findByIdForBuilding(
    buildingId: string,
    unitId: string,
  ): Promise<Unit | null> {
    return this.prisma.unit.findFirst({
      where: {
        id: unitId,
        buildingId,
      },
    });
  }
}
