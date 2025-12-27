import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildingAssignmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
  IsDefined,
} from 'class-validator';

export class ProvisionUserIdentityDto {
  @ApiProperty({ example: 'jane@org.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Jane Admin' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}

export class BuildingAssignmentGrantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  buildingId!: string;

  @ApiProperty({ enum: BuildingAssignmentType })
  @IsEnum(BuildingAssignmentType)
  type!: BuildingAssignmentType;
}

export type ResidentGrantMode = 'ADD' | 'MOVE';

export class ResidentGrantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  buildingId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  unitId!: string;

  @ApiPropertyOptional({ enum: ['ADD', 'MOVE'], default: 'ADD' })
  @IsOptional()
  @IsIn(['ADD', 'MOVE'])
  mode?: ResidentGrantMode;
}

export class ProvisionUserGrantsDto {
  @ApiPropertyOptional({ type: [String], example: ['admin', 'org_admin'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orgRoleKeys?: string[];

  @ApiPropertyOptional({ type: [BuildingAssignmentGrantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildingAssignmentGrantDto)
  buildingAssignments?: BuildingAssignmentGrantDto[];

  @ApiPropertyOptional({ type: ResidentGrantDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResidentGrantDto)
  resident?: ResidentGrantDto;
}

export type ProvisionIfEmailExists = 'LINK' | 'ERROR';

export class ProvisionModeDto {
  @ApiPropertyOptional({ enum: ['LINK', 'ERROR'], default: 'LINK' })
  @IsOptional()
  @IsIn(['LINK', 'ERROR'])
  ifEmailExists?: ProvisionIfEmailExists;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requireSameOrg?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  atomic?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  idempotent?: boolean;
}

export class ProvisionUserDto {
  @ApiProperty({ type: ProvisionUserIdentityDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProvisionUserIdentityDto)
  identity!: ProvisionUserIdentityDto;

  @ApiPropertyOptional({ type: ProvisionUserGrantsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProvisionUserGrantsDto)
  grants?: ProvisionUserGrantsDto;

  @ApiPropertyOptional({ type: ProvisionModeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProvisionModeDto)
  mode?: ProvisionModeDto;
}
