import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export type RolePermissionsUpdateMode = 'add' | 'replace';

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['users.read', 'roles.read'] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];

  @ApiProperty({ required: false, enum: ['add', 'replace'], default: 'replace' })
  @IsOptional()
  @IsIn(['add', 'replace'])
  mode?: RolePermissionsUpdateMode;
}
