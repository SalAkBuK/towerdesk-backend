import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { BuildingAccessGuard } from '../../common/guards/building-access.guard';
import {
  BuildingReadAccess,
  BuildingWriteAccess,
} from '../../common/decorators/building-access.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request-context';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { ListBuildingRequestsQueryDto } from './dto/list-building-requests.query.dto';
import {
  BuildingRequestResponseDto,
  toBuildingRequestResponse,
} from './dto/building-request.response.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { CreateRequestCommentDto } from './dto/create-request-comment.dto';
import { CreateRequestAttachmentsDto } from './dto/create-request-attachments.dto';
import {
  RequestCommentResponseDto,
  toRequestCommentResponse,
} from './dto/request-comment.response.dto';

@ApiTags('building-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgScopeGuard, BuildingAccessGuard)
@Controller('org/buildings/:buildingId/requests')
export class BuildingRequestsController {
  constructor(private readonly requestsService: MaintenanceRequestsService) {}

  @Get()
  @BuildingReadAccess()
  @RequirePermissions('requests.read')
  @ApiOkResponse({ type: [BuildingRequestResponseDto] })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Query() query: ListBuildingRequestsQueryDto,
  ) {
    const requests = await this.requestsService.listBuildingRequests(
      user,
      buildingId,
      query.status,
    );
    return requests.map(toBuildingRequestResponse);
  }

  @Get(':requestId')
  @BuildingReadAccess()
  @RequirePermissions('requests.read')
  @ApiOkResponse({ type: BuildingRequestResponseDto })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.requestsService.getBuildingRequest(
      user,
      buildingId,
      requestId,
    );
    return toBuildingRequestResponse(request);
  }

  @Post(':requestId/assign')
  @BuildingWriteAccess(true)
  @RequirePermissions('requests.assign')
  @ApiOkResponse({ type: BuildingRequestResponseDto })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
    @Body() dto: AssignRequestDto,
  ) {
    const request = await this.requestsService.assignRequest(
      user,
      buildingId,
      requestId,
      dto,
    );
    return toBuildingRequestResponse(request);
  }

  @Post(':requestId/status')
  @BuildingReadAccess()
  @RequirePermissions('requests.update_status')
  @ApiOkResponse({ type: BuildingRequestResponseDto })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    const request = await this.requestsService.updateRequestStatus(
      user,
      buildingId,
      requestId,
      dto,
    );
    return toBuildingRequestResponse(request);
  }

  @Post(':requestId/cancel')
  @BuildingReadAccess()
  @RequirePermissions('requests.update_status')
  @ApiOkResponse({ type: BuildingRequestResponseDto })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.requestsService.cancelBuildingRequest(
      user,
      buildingId,
      requestId,
    );
    return toBuildingRequestResponse(request);
  }

  @Post(':requestId/comments')
  @BuildingReadAccess()
  @RequirePermissions('requests.comment')
  @ApiOkResponse({ type: RequestCommentResponseDto })
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
    @Body() dto: CreateRequestCommentDto,
  ) {
    const comment = await this.requestsService.addBuildingComment(
      user,
      buildingId,
      requestId,
      dto,
    );
    return toRequestCommentResponse(comment);
  }

  @Get(':requestId/comments')
  @BuildingReadAccess()
  @RequirePermissions('requests.comment')
  @ApiOkResponse({ type: [RequestCommentResponseDto] })
  async listComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
  ) {
    const comments = await this.requestsService.listBuildingComments(
      user,
      buildingId,
      requestId,
    );
    return comments.map(toRequestCommentResponse);
  }

  @Post(':requestId/attachments')
  @BuildingReadAccess()
  @RequirePermissions('requests.comment')
  @ApiOkResponse({ type: BuildingRequestResponseDto })
  async addAttachments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('requestId') requestId: string,
    @Body() dto: CreateRequestAttachmentsDto,
  ) {
    const request = await this.requestsService.addBuildingAttachments(
      user,
      buildingId,
      requestId,
      dto,
    );
    return toBuildingRequestResponse(request);
  }
}
