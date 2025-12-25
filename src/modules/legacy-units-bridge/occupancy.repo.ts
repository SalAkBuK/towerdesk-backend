import { Injectable } from '@nestjs/common';
import { UnitBridgeStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OccupancyBridgeRepo {
  constructor(private readonly prisma: PrismaService) {}

  findUnitByNumber(legacyBuildingId: number, unitNumberNorm: string) {
    return this.prisma.unitBridge.findUnique({
      where: {
        legacyBuildingId_unitNumberNorm: {
          legacyBuildingId,
          unitNumberNorm,
        },
      },
    });
  }

  getActiveOccupancyByUnit(unitId: string) {
    return this.prisma.occupancyBridge.findFirst({
      where: { unitId, endDate: null },
    });
  }

  getActiveOccupancyByTenant(legacyTenantId: number) {
    return this.prisma.occupancyBridge.findFirst({
      where: { legacyTenantId, endDate: null },
    });
  }

  listOccupanciesByTenant(
    legacyTenantId: number,
    pagination: { take: number; skip: number },
  ) {
    return this.prisma.occupancyBridge.findMany({
      where: { legacyTenantId },
      include: { unit: true },
      orderBy: { startDate: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
    });
  }

  async assignOccupancy(data: {
    unitId: string;
    legacyTenantId: number;
    startDate: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.unitBridge.findUnique({
        where: { id: data.unitId },
      });
      if (!unit) {
        return { status: 'missing-unit' as const };
      }
      if (unit.status !== UnitBridgeStatus.AVAILABLE) {
        return { status: 'unit-occupied' as const };
      }

      const activeUnit = await tx.occupancyBridge.findFirst({
        where: { unitId: data.unitId, endDate: null },
      });
      if (activeUnit) {
        return { status: 'unit-occupied' as const };
      }

      const activeTenant = await tx.occupancyBridge.findFirst({
        where: { legacyTenantId: data.legacyTenantId, endDate: null },
      });
      if (activeTenant) {
        return { status: 'tenant-occupied' as const };
      }

      const occupancy = await tx.occupancyBridge.create({
        data: {
          legacyTenantId: data.legacyTenantId,
          unitId: data.unitId,
          startDate: data.startDate,
        },
        include: { unit: true },
      });

      await tx.unitBridge.update({
        where: { id: data.unitId },
        data: { status: UnitBridgeStatus.OCCUPIED },
      });

      return { status: 'ok' as const, occupancy };
    });
  }

  async unassignOccupancy(data: { legacyTenantId: number; endDate: Date }) {
    return this.prisma.$transaction(async (tx) => {
      const active = await tx.occupancyBridge.findFirst({
        where: { legacyTenantId: data.legacyTenantId, endDate: null },
        include: { unit: true },
      });
      if (!active) {
        return { status: 'not-found' as const };
      }

      const occupancy = await tx.occupancyBridge.update({
        where: { id: active.id },
        data: { endDate: data.endDate },
        include: { unit: true },
      });

      await tx.unitBridge.update({
        where: { id: active.unitId },
        data: { status: UnitBridgeStatus.AVAILABLE },
      });

      return { status: 'ok' as const, occupancy };
    });
  }

  
}
