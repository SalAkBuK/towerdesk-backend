import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Occupancy, Unit, User } from '@prisma/client';

export class ResidentListUnitDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class ResidentListItemDto {
  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: ResidentListUnitDto })
  unit!: ResidentListUnitDto;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  endAt?: Date | null;
}

type OccupancyWithRelations = Occupancy & {
  unit: Unit;
  residentUser: User;
};

export const toResidentListItem = (
  occupancy: OccupancyWithRelations,
): ResidentListItemDto => ({
  userId: occupancy.residentUser.id,
  name: occupancy.residentUser.name ?? null,
  email: occupancy.residentUser.email,
  unit: {
    id: occupancy.unit.id,
    label: occupancy.unit.label,
  },
  status: occupancy.status,
  startAt: occupancy.startAt,
  endAt: occupancy.endAt ?? null,
});
