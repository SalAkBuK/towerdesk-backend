import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export type UserRolesUpdateMode = 'add' | 'replace';

export class AssignUserRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];

  @ApiProperty({ required: false, enum: ['add', 'replace'], default: 'replace' })
  @IsOptional()
  @IsIn(['add', 'replace'])
  mode?: UserRolesUpdateMode;
}
