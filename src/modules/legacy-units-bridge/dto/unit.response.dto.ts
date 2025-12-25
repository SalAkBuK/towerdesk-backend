import { ApiProperty } from '@nestjs/swagger';
import {
  AreaUnit,
  OwnershipType,
  ParkingType,
  UnitBridge,
  UnitBridgeStatus,
  UnitType,
  WaterConnectionType,
} from '@prisma/client';

export class UnitBridgeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  legacyBuildingId!: number;

  @ApiProperty()
  legacyAdminId!: number;

  @ApiProperty()
  buildingName!: string;

  @ApiProperty()
  unitNumberRaw!: string;

  @ApiProperty()
  unitNumberNorm!: string;

  @ApiProperty({ enum: UnitType })
  unitType!: UnitType;

  @ApiProperty()
  floorNumber!: string;

  @ApiProperty({ enum: OwnershipType })
  ownershipType!: OwnershipType;

  @ApiProperty({ required: false })
  furnished?: boolean | null;

  @ApiProperty({ required: false })
  areaSize?: number | null;

  @ApiProperty({ required: false, enum: AreaUnit })
  areaUnit?: AreaUnit | null;

  @ApiProperty({ required: false })
  numberOfRooms?: number | null;

  @ApiProperty({ required: false })
  numberOfBedrooms?: number | null;

  @ApiProperty({ required: false })
  numberOfBathrooms?: number | null;

  @ApiProperty({ required: false })
  kitchen?: boolean | null;

  @ApiProperty({ required: false })
  balcony?: boolean | null;

  @ApiProperty({ required: false })
  ownerName?: string | null;

  @ApiProperty({ required: false })
  ownerCnicOrId?: string | null;

  @ApiProperty({ required: false })
  ownerContactNumber?: string | null;

  @ApiProperty({ required: false })
  electricityMeterNumber?: string | null;

  @ApiProperty({ required: false })
  gasMeterNumber?: string | null;

  @ApiProperty({ required: false, enum: WaterConnectionType })
  waterConnectionType?: WaterConnectionType | null;

  @ApiProperty({ required: false })
  monthlyRent?: number | null;

  @ApiProperty({ required: false })
  maintenanceCharges?: number | null;

  @ApiProperty({ required: false })
  securityDeposit?: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ required: false })
  parkingSlotNumber?: string | null;

  @ApiProperty({ required: false, enum: ParkingType })
  parkingType?: ParkingType | null;

  @ApiProperty({ enum: UnitBridgeStatus })
  status!: UnitBridgeStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

type UnitWithBuilding = UnitBridge & {
  building: { legacyAdminId: number; buildingName: string };
};

export const toUnitBridgeResponse = (
  unit: UnitWithBuilding,
): UnitBridgeResponseDto => ({
  id: unit.id,
  legacyBuildingId: unit.legacyBuildingId,
  legacyAdminId: unit.building.legacyAdminId,
  buildingName: unit.building.buildingName,
  unitNumberRaw: unit.unitNumberRaw,
  unitNumberNorm: unit.unitNumberNorm,
  unitType: unit.unitType,
  floorNumber: unit.floorNumber,
  ownershipType: unit.ownershipType,
  furnished: unit.furnished,
  areaSize: unit.areaSize === null ? null : Number(unit.areaSize),
  areaUnit: unit.areaUnit,
  numberOfRooms: unit.numberOfRooms,
  numberOfBedrooms: unit.numberOfBedrooms,
  numberOfBathrooms: unit.numberOfBathrooms,
  kitchen: unit.kitchen,
  balcony: unit.balcony,
  ownerName: unit.ownerName,
  ownerCnicOrId: unit.ownerCnicOrId,
  ownerContactNumber: unit.ownerContactNumber,
  electricityMeterNumber: unit.electricityMeterNumber,
  gasMeterNumber: unit.gasMeterNumber,
  waterConnectionType: unit.waterConnectionType,
  monthlyRent: unit.monthlyRent === null ? null : Number(unit.monthlyRent),
  maintenanceCharges:
    unit.maintenanceCharges === null ? null : Number(unit.maintenanceCharges),
  securityDeposit:
    unit.securityDeposit === null ? null : Number(unit.securityDeposit),
  currency: unit.currency,
  parkingSlotNumber: unit.parkingSlotNumber,
  parkingType: unit.parkingType,
  status: unit.status,
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
});
