import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateOrgDto {
  @ApiProperty({ example: 'Towerdesk Inc.' })
  @IsString()
  @MinLength(2)
  name!: string;
}
