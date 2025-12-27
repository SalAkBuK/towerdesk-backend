import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { BuildingReadAccess, BuildingWriteAccess } from '../../common/decorators/building-access.decorator';
import { BuildingAccessGuard } from '../../common/guards/building-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request-context';
import { BuildingAssignmentsService } from './building-assignments.service';
import { CreateBuildingAssignmentDto } from './dto/create-building-assignment.dto';
import {
  BuildingAssignmentResponseDto,
  toBuildingAssignmentResponse,
} from './dto/building-assignment.response.dto';

@ApiTags('building-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgScopeGuard, BuildingAccessGuard)
@Controller('org/buildings/:buildingId/assignments')
export class BuildingAssignmentsController {
  constructor(
    private readonly buildingAssignmentsService: BuildingAssignmentsService,
  ) {}

  @Post()
  @BuildingWriteAccess(true)
  @RequirePermissions('building.assignments.write')
  @ApiOkResponse({ type: BuildingAssignmentResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateBuildingAssignmentDto,
  ) {
    const assignment = await this.buildingAssignmentsService.create(
      user,
      buildingId,
      dto,
    );
    return toBuildingAssignmentResponse(assignment);
  }

  @Get()
  @BuildingReadAccess()
  @RequirePermissions('building.assignments.read')
  @ApiOkResponse({ type: [BuildingAssignmentResponseDto] })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
  ) {
    const assignments = await this.buildingAssignmentsService.list(
      user,
      buildingId,
    );
    return assignments.map(toBuildingAssignmentResponse);
  }
}
