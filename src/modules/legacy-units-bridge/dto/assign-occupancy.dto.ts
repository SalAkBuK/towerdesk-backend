import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AssignOccupancyDto {
  @ApiProperty({ example: 9001 })
  @IsInt()
  @Min(1)
  legacyTenantId!: number;

  @ApiProperty({ example: 5001 })
  @IsInt()
  @Min(1)
  legacyBuildingId!: number;

  @ApiProperty({ example: '12A' })
  @IsString()
  @MinLength(1)
  unitNumber!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;
}
