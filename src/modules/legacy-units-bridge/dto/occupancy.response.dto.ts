import { ApiProperty } from '@nestjs/swagger';
import { OccupancyBridge } from '@prisma/client';

export class OccupancyBridgeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  legacyTenantId!: number;

  @ApiProperty()
  unitId!: string;

  @ApiProperty()
  legacyBuildingId!: number;

  @ApiProperty()
  unitNumberRaw!: string;

  @ApiProperty()
  unitNumberNorm!: string;

  @ApiProperty()
  startDate!: Date;

  @ApiProperty({ required: false })
  endDate?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

type OccupancyWithUnit = OccupancyBridge & {
  unit: { legacyBuildingId: number; unitNumberRaw: string; unitNumberNorm: string };
};

export const toOccupancyResponse = (
  occupancy: OccupancyWithUnit,
): OccupancyBridgeResponseDto => ({
  id: occupancy.id,
  legacyTenantId: occupancy.legacyTenantId,
  unitId: occupancy.unitId,
  legacyBuildingId: occupancy.unit.legacyBuildingId,
  unitNumberRaw: occupancy.unit.unitNumberRaw,
  unitNumberNorm: occupancy.unit.unitNumberNorm,
  startDate: occupancy.startDate,
  endDate: occupancy.endDate,
  createdAt: occupancy.createdAt,
  updatedAt: occupancy.updatedAt,
});
