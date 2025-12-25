import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitBridgeResponseDto } from './dto/unit.response.dto';
import { UnitsBridgeService } from './units.service';

@ApiTags('legacy-bridge')
@Controller('legacy-bridge/units')
export class UnitsBridgeController {
  constructor(private readonly unitsService: UnitsBridgeService) {}

  @Post()
  @ApiOkResponse({ type: UnitBridgeResponseDto })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.createUnit(dto);
  }

  @Patch(':unitId')
  @ApiOkResponse({ type: UnitBridgeResponseDto })
  update(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.updateUnit(unitId, dto);
  }

  @Get('by-admin/:legacyAdminId')
  @ApiOkResponse({ type: [UnitBridgeResponseDto] })
  listByAdmin(
    @Param('legacyAdminId', ParseIntPipe) legacyAdminId: number,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.unitsService.listByAdmin(legacyAdminId, pagination);
  }

  @Get('by-building/:legacyBuildingId')
  @ApiOkResponse({ type: [UnitBridgeResponseDto] })
  listByBuilding(
    @Param('legacyBuildingId', ParseIntPipe) legacyBuildingId: number,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.unitsService.listByBuilding(legacyBuildingId, pagination);
  }
}
