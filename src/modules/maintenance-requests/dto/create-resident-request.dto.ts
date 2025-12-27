import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ResidentRequestAttachmentDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty()
  @IsString()
  url!: string;
}

export class CreateResidentRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ['CLEANING', 'ELECTRICAL', 'MAINTENANCE', 'PLUMBING_AC_HEATING', 'OTHER'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return normalized === 'MAINTAINCE' ? 'MAINTENANCE' : normalized;
  })
  @IsIn([
    'CLEANING',
    'ELECTRICAL',
    'MAINTENANCE',
    'PLUMBING_AC_HEATING',
    'OTHER',
  ])
  type?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;

  @ApiPropertyOptional({ type: [ResidentRequestAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResidentRequestAttachmentDto)
  attachments?: ResidentRequestAttachmentDto[];
}
