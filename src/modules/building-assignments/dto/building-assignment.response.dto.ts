import { ApiProperty } from '@nestjs/swagger';
import { BuildingAssignment, BuildingAssignmentType, User } from '@prisma/client';

export class AssignmentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  name?: string | null;
}

export class BuildingAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: BuildingAssignmentType })
  type!: BuildingAssignmentType;

  @ApiProperty({ type: AssignmentUserDto })
  user!: AssignmentUserDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const toAssignmentUser = (user: User): AssignmentUserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export const toBuildingAssignmentResponse = (
  assignment: BuildingAssignment & { user: User },
): BuildingAssignmentResponseDto => ({
  id: assignment.id,
  buildingId: assignment.buildingId,
  userId: assignment.userId,
  type: assignment.type,
  user: toAssignmentUser(assignment.user),
  createdAt: assignment.createdAt,
  updatedAt: assignment.updatedAt,
});
