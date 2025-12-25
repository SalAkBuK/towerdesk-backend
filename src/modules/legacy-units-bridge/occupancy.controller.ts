import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query.dto';
import { AssignOccupancyDto } from './dto/assign-occupancy.dto';
import { OccupancyBridgeResponseDto } from './dto/occupancy.response.dto';
import { UnassignOccupancyDto } from './dto/unassign-occupancy.dto';
import { OccupancyBridgeService } from './occupancy.service';

@ApiTags('legacy-bridge')
@Controller('legacy-bridge/occupancy')
export class OccupancyBridgeController {
  constructor(private readonly occupancyService: OccupancyBridgeService) {}

  @Post('assign')
  @ApiOkResponse({ type: OccupancyBridgeResponseDto })
  assign(@Body() dto: AssignOccupancyDto) {
    return this.occupancyService.assign(dto);
  }

  @Post('unassign')
  @ApiOkResponse({ type: OccupancyBridgeResponseDto })
  unassign(@Body() dto: UnassignOccupancyDto) {
    return this.occupancyService.unassign(dto);
  }

  @Get('by-tenant/:legacyTenantId')
  @ApiOkResponse({ type: [OccupancyBridgeResponseDto] })
  listByTenant(
    @Param('legacyTenantId', ParseIntPipe) legacyTenantId: number,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.occupancyService.listByTenant(legacyTenantId, pagination);
  }
}
