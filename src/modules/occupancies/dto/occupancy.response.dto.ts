import { ApiProperty } from '@nestjs/swagger';
import { Occupancy, OccupancyStatus, Unit, User } from '@prisma/client';

export class OccupancyUnitDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class OccupancyResidentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  name?: string | null;
}

export class OccupancyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiProperty()
  unitId!: string;

  @ApiProperty()
  residentUserId!: string;

  @ApiProperty({ enum: OccupancyStatus })
  status!: OccupancyStatus;

  @ApiProperty()
  startAt!: Date;

  @ApiProperty({ required: false })
  endAt?: Date | null;

  @ApiProperty({ type: OccupancyUnitDto })
  unit!: OccupancyUnitDto;

  @ApiProperty({ type: OccupancyResidentDto })
  resident!: OccupancyResidentDto;
}

export const toOccupancyResponse = (
  occupancy: Occupancy & { unit: Unit; residentUser: User },
): OccupancyResponseDto => ({
  id: occupancy.id,
  buildingId: occupancy.buildingId,
  unitId: occupancy.unitId,
  residentUserId: occupancy.residentUserId,
  status: occupancy.status,
  startAt: occupancy.startAt,
  endAt: occupancy.endAt ?? null,
  unit: {
    id: occupancy.unit.id,
    label: occupancy.unit.label,
  },
  resident: {
    id: occupancy.residentUser.id,
    email: occupancy.residentUser.email,
    name: occupancy.residentUser.name,
  },
});
