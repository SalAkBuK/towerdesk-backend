import { Injectable } from '@nestjs/common';
import {
  AreaUnit,
  OwnershipType,
  ParkingType,
  Prisma,
  UnitBridgeStatus,
  UnitType,
  WaterConnectionType,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class UnitsBridgeRepo {
  constructor(private readonly prisma: PrismaService) {}

  findBuilding(legacyBuildingId: number) {
    return this.prisma.buildingBridge.findUnique({
      where: { legacyBuildingId },
    });
  }

  createBuilding(data: Prisma.BuildingBridgeCreateInput) {
    return this.prisma.buildingBridge.create({ data });
  }

  findUnitByNumber(legacyBuildingId: number, unitNumberNorm: string) {
    return this.prisma.unitBridge.findUnique({
      where: {
        legacyBuildingId_unitNumberNorm: {
          legacyBuildingId,
          unitNumberNorm,
        },
      },
      include: { building: true },
    });
  }

  findUnitById(id: string) {
    return this.prisma.unitBridge.findUnique({
      where: { id },
      include: { building: true },
    });
  }

  createUnit(data: {
    legacyBuildingId: number;
    unitNumberRaw: string;
    unitNumberNorm: string;
    unitType: UnitType;
    floorNumber: string;
    ownershipType: OwnershipType;
    furnished?: boolean | null;
    areaSize?: number | null;
    areaUnit?: AreaUnit | null;
    numberOfRooms?: number | null;
    numberOfBedrooms?: number | null;
    numberOfBathrooms?: number | null;
    kitchen?: boolean | null;
    balcony?: boolean | null;
    ownerName?: string | null;
    ownerCnicOrId?: string | null;
    ownerContactNumber?: string | null;
    electricityMeterNumber?: string | null;
    gasMeterNumber?: string | null;
    waterConnectionType?: WaterConnectionType | null;
    monthlyRent?: number | null;
    maintenanceCharges?: number | null;
    securityDeposit?: number | null;
    currency?: string | null;
    parkingSlotNumber?: string | null;
    parkingType?: ParkingType | null;
    status: UnitBridgeStatus;
  }) {
    return this.prisma.unitBridge.create({
      data: {
        unitNumberRaw: data.unitNumberRaw,
        unitNumberNorm: data.unitNumberNorm,
        unitType: data.unitType,
        floorNumber: data.floorNumber,
        ownershipType: data.ownershipType,
        furnished: data.furnished ?? null,
        areaSize: data.areaSize ?? null,
        areaUnit: data.areaUnit ?? null,
        numberOfRooms: data.numberOfRooms ?? null,
        numberOfBedrooms: data.numberOfBedrooms ?? null,
        numberOfBathrooms: data.numberOfBathrooms ?? null,
        kitchen: data.kitchen ?? null,
        balcony: data.balcony ?? null,
        ownerName: data.ownerName ?? null,
        ownerCnicOrId: data.ownerCnicOrId ?? null,
        ownerContactNumber: data.ownerContactNumber ?? null,
        electricityMeterNumber: data.electricityMeterNumber ?? null,
        gasMeterNumber: data.gasMeterNumber ?? null,
        waterConnectionType: data.waterConnectionType ?? null,
        monthlyRent: data.monthlyRent ?? null,
        maintenanceCharges: data.maintenanceCharges ?? null,
        securityDeposit: data.securityDeposit ?? null,
        currency: data.currency ?? undefined,
        parkingSlotNumber: data.parkingSlotNumber ?? null,
        parkingType: data.parkingType ?? null,
        status: data.status,
        building: {
          connect: {
            legacyBuildingId: data.legacyBuildingId,
          },
        },
      },
      include: { building: true },
    });
  }

  listUnitsByAdmin(legacyAdminId: number, pagination: { take: number; skip: number }) {
    return this.prisma.unitBridge.findMany({
      where: { building: { legacyAdminId } },
      include: { building: true },
      orderBy: { unitNumberNorm: 'asc' },
      take: pagination.take,
      skip: pagination.skip,
    });
  }

  listUnitsByBuilding(legacyBuildingId: number, pagination: { take: number; skip: number }) {
    return this.prisma.unitBridge.findMany({
      where: { legacyBuildingId },
      include: { building: true },
      orderBy: { unitNumberNorm: 'asc' },
      take: pagination.take,
      skip: pagination.skip,
    });
  }

  updateUnitStatus(id: string, status: UnitBridgeStatus) {
    return this.prisma.unitBridge.update({
      where: { id },
      data: { status },
    });
  }

  updateUnit(id: string, data: Prisma.UnitBridgeUpdateInput) {
    return this.prisma.unitBridge.update({
      where: { id },
      data,
      include: { building: true },
    });
  }
}
