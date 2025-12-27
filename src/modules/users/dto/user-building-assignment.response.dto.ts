import { ApiProperty } from '@nestjs/swagger';
import { BuildingAssignmentType } from '@prisma/client';

export class UserBuildingAssignmentResponseDto {
  @ApiProperty()
  buildingId!: string;

  @ApiProperty()
  buildingName!: string;

  @ApiProperty({ enum: BuildingAssignmentType })
  type!: BuildingAssignmentType;
}
