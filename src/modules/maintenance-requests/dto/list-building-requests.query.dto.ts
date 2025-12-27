import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MaintenanceRequestStatusEnum } from '../maintenance-requests.constants';

export class ListBuildingRequestsQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceRequestStatusEnum })
  @IsOptional()
  @IsEnum(MaintenanceRequestStatusEnum)
  status?: MaintenanceRequestStatusEnum;
}
