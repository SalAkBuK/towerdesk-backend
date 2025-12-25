import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'custom_role' })
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9_]+$/)
  key!: string;

  @ApiProperty({ example: 'Custom Role' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
