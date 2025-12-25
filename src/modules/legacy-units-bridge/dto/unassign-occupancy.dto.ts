import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class UnassignOccupancyDto {
  @ApiProperty({ example: 9001 })
  @IsInt()
  @Min(1)
  legacyTenantId!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
