import { ApiProperty } from '@nestjs/swagger';
import { BuildingAssignmentType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateBuildingAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: BuildingAssignmentType })
  @IsEnum(BuildingAssignmentType)
  type!: BuildingAssignmentType;
}
