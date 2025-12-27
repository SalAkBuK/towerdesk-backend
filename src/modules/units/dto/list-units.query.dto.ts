import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListUnitsQueryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  available?: boolean;
}
