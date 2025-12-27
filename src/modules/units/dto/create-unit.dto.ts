import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'A-101' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiProperty({ required: false, example: 'Near elevator' })
  @IsOptional()
  @IsString()
  notes?: string;
}
