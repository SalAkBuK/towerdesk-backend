import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { BuildingReadAccess, BuildingWriteAccess } from '../../common/decorators/building-access.decorator';
import { BuildingAccessGuard } from '../../common/guards/building-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request-context';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units.query.dto';
import { UnitResponseDto, toUnitResponse } from './dto/unit.response.dto';
import { UnitBasicResponseDto, toUnitBasicResponse } from './dto/unit-basic.response.dto';
import { UnitsService } from './units.service';

@ApiTags('org-units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgScopeGuard, BuildingAccessGuard)
@Controller('org/buildings/:buildingId/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @BuildingWriteAccess(true)
  @RequirePermissions('units.write')
  @ApiOkResponse({ type: UnitResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateUnitDto,
  ) {
    const unit = await this.unitsService.create(user, buildingId, dto);
    return toUnitResponse(unit);
  }

  @Get()
  @BuildingReadAccess()
  @RequirePermissions('units.read')
  @ApiOkResponse({ type: [UnitResponseDto] })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Query() query: ListUnitsQueryDto,
  ) {
    const units = await this.unitsService.list(
      user,
      buildingId,
      query.available,
    );
    return units.map(toUnitResponse);
  }

  @Get('basic')
  @BuildingReadAccess(true)
  @RequirePermissions('units.read')
  @ApiOkResponse({ type: [UnitBasicResponseDto] })
  async listBasic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
  ) {
    const units = await this.unitsService.list(user, buildingId);
    return units.map(toUnitBasicResponse);
  }

  @Get('count')
  @BuildingReadAccess()
  @RequirePermissions('units.read')
  @ApiOkResponse({
    schema: {
      example: { total: 120, vacant: 45 },
    },
  })
  async count(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
  ) {
    return this.unitsService.countVacant(user, buildingId);
  }
}
