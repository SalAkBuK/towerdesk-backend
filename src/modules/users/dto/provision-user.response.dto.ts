import { ApiProperty } from '@nestjs/swagger';
import { BuildingAssignmentType } from '@prisma/client';

export class ProvisionedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  name?: string | null;
}

export class ProvisionedBuildingAssignmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiProperty({ enum: BuildingAssignmentType })
  type!: BuildingAssignmentType;
}

export class ProvisionedResidentDto {
  @ApiProperty()
  occupancyId!: string;

  @ApiProperty()
  unitId!: string;

  @ApiProperty()
  buildingId!: string;
}

export class ProvisionedAppliedDto {
  @ApiProperty({ type: [String] })
  orgRoleKeys!: string[];

  @ApiProperty({ type: [ProvisionedBuildingAssignmentDto] })
  buildingAssignments!: ProvisionedBuildingAssignmentDto[];

  @ApiProperty({ required: false, type: ProvisionedResidentDto, nullable: true })
  resident?: ProvisionedResidentDto | null;
}

export class ProvisionUserResponseDto {
  @ApiProperty({ type: ProvisionedUserDto })
  user!: ProvisionedUserDto;

  @ApiProperty()
  created!: boolean;

  @ApiProperty()
  linkedExisting!: boolean;

  @ApiProperty({ type: ProvisionedAppliedDto })
  applied!: ProvisionedAppliedDto;
}
