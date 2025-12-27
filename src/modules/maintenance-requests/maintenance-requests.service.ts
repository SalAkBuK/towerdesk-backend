import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BuildingAssignmentType,
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  MaintenanceRequestType,
} from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { BuildingAccessService } from '../../common/building-access/building-access.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MaintenanceRequestsRepo } from './maintenance-requests.repo';
import { CreateResidentRequestDto } from './dto/create-resident-request.dto';
import { UpdateResidentRequestDto } from './dto/update-resident-request.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { CreateRequestCommentDto } from './dto/create-request-comment.dto';
import { CreateRequestAttachmentsDto } from './dto/create-request-attachments.dto';
import {
  MaintenanceRequestStatusEnum,
  MAINTENANCE_STATUS_TRANSITIONS,
} from './maintenance-requests.constants';

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestsRepo: MaintenanceRequestsRepo,
    private readonly buildingAccessService: BuildingAccessService,
    private readonly accessControlService: AccessControlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createResidentRequest(
    user: AuthenticatedUser | undefined,
    dto: CreateResidentRequestDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.prisma.$transaction(async (tx) => {
      const occupancy = await this.requestsRepo.findAssignedActiveOccupancy(
        userId,
        tx,
      );
      if (!occupancy || occupancy.building.orgId !== orgId) {
        throw new ForbiddenException('Active occupancy required');
      }

      const attachments =
        dto.attachments?.map((attachment) => ({
          orgId,
          uploadedByUserId: userId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          url: attachment.url,
        })) ?? [];

      const request = await this.requestsRepo.createRequestWithAttachments(
        {
          org: { connect: { id: orgId } },
          building: { connect: { id: occupancy.buildingId } },
          unit: { connect: { id: occupancy.unitId } },
          createdByUser: { connect: { id: userId } },
          title: dto.title,
          description: dto.description,
          type: this.normalizeType(dto.type),
          priority: this.normalizePriority(dto.priority),
          status: MaintenanceRequestStatusEnum.OPEN,
        },
        attachments,
        tx,
      );

      await this.notificationsService.notifyRequestCreated(tx, request, userId);

      return request;
    });
  }

  async listResidentRequests(user: AuthenticatedUser | undefined) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.requestsRepo.listByCreator(orgId, userId);
  }

  async getResidentRequest(user: AuthenticatedUser | undefined, requestId: string) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const request = await this.requestsRepo.findByIdForCreator(
      orgId,
      userId,
      requestId,
    );
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    return request;
  }

  async updateResidentRequest(
    user: AuthenticatedUser | undefined,
    requestId: string,
    dto: UpdateResidentRequestDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const request = await this.requestsRepo.findByIdForCreator(
      orgId,
      userId,
      requestId,
    );
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.status !== MaintenanceRequestStatusEnum.OPEN) {
      throw new ConflictException('Request cannot be edited');
    }

    if (!dto.title && dto.description === undefined) {
      throw new BadRequestException('No changes provided');
    }

    return this.requestsRepo.updateById(request.id, {
      title: dto.title ?? request.title,
      description: dto.description ?? request.description,
    });
  }

  async cancelResidentRequest(
    user: AuthenticatedUser | undefined,
    requestId: string,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForCreator(
        orgId,
        userId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }
      if (
        request.status === MaintenanceRequestStatusEnum.COMPLETED ||
        request.status === MaintenanceRequestStatusEnum.CANCELED
      ) {
        throw new ConflictException('Request cannot be canceled');
      }

      const updated = await this.requestsRepo.updateById(
        request.id,
        {
          status: MaintenanceRequestStatusEnum.CANCELED,
          canceledAt: new Date(),
        },
        tx,
      );

      await this.notificationsService.notifyRequestCanceled(
        tx,
        updated,
        userId,
      );

      return updated;
    });
  }

  async addResidentComment(
    user: AuthenticatedUser | undefined,
    requestId: string,
    dto: CreateRequestCommentDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForCreator(
        orgId,
        userId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }
      if (
        request.status === MaintenanceRequestStatusEnum.CANCELED ||
        request.status === MaintenanceRequestStatusEnum.COMPLETED
      ) {
        throw new ConflictException('Request is closed');
      }

      const comment = await this.requestsRepo.createComment(
        {
          request: { connect: { id: request.id } },
          org: { connect: { id: orgId } },
          authorUser: { connect: { id: userId } },
          message: dto.message,
        },
        tx,
      );

      await this.notificationsService.notifyRequestCommented(
        tx,
        request,
        comment,
        userId,
        true,
      );

      return comment;
    });
  }

  async listResidentComments(
    user: AuthenticatedUser | undefined,
    requestId: string,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const request = await this.requestsRepo.findByIdForCreator(
      orgId,
      userId,
      requestId,
    );
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return this.requestsRepo.listComments(orgId, request.id);
  }

  async listBuildingRequests(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    status?: MaintenanceRequestStatusEnum,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    const hasRequestsRead = await this.hasGlobalPermission(
      userId,
      'requests.read',
    );

    const assignedToUserId =
      assignmentType === BuildingAssignmentType.STAFF && !hasRequestsRead
        ? userId
        : undefined;

    return this.requestsRepo.listByBuilding(
      orgId,
      buildingId,
      status,
      assignedToUserId,
    );
  }

  async getBuildingRequest(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const request = await this.requestsRepo.findByIdForBuilding(
      orgId,
      buildingId,
      requestId,
    );
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );
    const hasRequestsRead = await this.hasGlobalPermission(
      userId,
      'requests.read',
    );

    if (
      assignmentType === BuildingAssignmentType.STAFF &&
      !hasRequestsRead &&
      request.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    return request;
  }

  async assignRequest(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
    dto: AssignRequestDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    if (assignmentType === BuildingAssignmentType.STAFF) {
      throw new ForbiddenException('Staff cannot assign requests');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }
      if (
        request.status !== MaintenanceRequestStatusEnum.OPEN &&
        request.status !== MaintenanceRequestStatusEnum.ASSIGNED
      ) {
        throw new ConflictException('Request is not open or assigned');
      }

      const staffUser = await this.requestsRepo.findUserById(
        dto.staffUserId,
        tx,
      );
      if (!staffUser || !staffUser.isActive || staffUser.orgId !== orgId) {
        throw new BadRequestException('Staff user not in org');
      }

      const staffAssignment = await this.requestsRepo.findBuildingAssignment(
        buildingId,
        staffUser.id,
        tx,
      );
      if (!staffAssignment) {
        throw new BadRequestException('Staff user not assigned to building');
      }

      const updated = await this.requestsRepo.updateById(
        request.id,
        {
          assignedToUser: { connect: { id: staffUser.id } },
          assignedAt: new Date(),
          status: MaintenanceRequestStatusEnum.ASSIGNED,
        },
        tx,
      );

      await this.notificationsService.notifyRequestAssigned(
        tx,
        updated,
        userId,
      );

      return updated;
    });
  }

  async updateRequestStatus(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
    dto: UpdateRequestStatusDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }

      const currentStatus = request.status as MaintenanceRequestStatusEnum;
      if (
        !MAINTENANCE_STATUS_TRANSITIONS[currentStatus]?.includes(dto.status)
      ) {
        throw new ConflictException('Invalid status transition');
      }

      if (assignmentType === BuildingAssignmentType.STAFF) {
        if (request.assignedToUserId !== userId) {
          throw new ForbiddenException('Forbidden');
        }
      }

      const updated = await this.requestsRepo.updateById(
        request.id,
        {
          status: dto.status,
          completedAt:
            dto.status === MaintenanceRequestStatusEnum.COMPLETED
              ? new Date()
              : request.completedAt,
        },
        tx,
      );

      await this.notificationsService.notifyRequestStatusChanged(
        tx,
        updated,
        userId,
      );

      return updated;
    });
  }

  async cancelBuildingRequest(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    if (!assignmentType) {
      const hasPermission = await this.hasGlobalPermission(
        userId,
        'requests.update_status',
      );
      if (!hasPermission) {
        throw new ForbiddenException('Forbidden');
      }
    }

    if (assignmentType === BuildingAssignmentType.STAFF) {
      throw new ForbiddenException('Staff cannot cancel requests');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }
      if (
        request.status === MaintenanceRequestStatusEnum.COMPLETED ||
        request.status === MaintenanceRequestStatusEnum.CANCELED
      ) {
        throw new ConflictException('Request cannot be canceled');
      }

      const updated = await this.requestsRepo.updateById(
        request.id,
        {
          status: MaintenanceRequestStatusEnum.CANCELED,
          canceledAt: new Date(),
        },
        tx,
      );

      await this.notificationsService.notifyRequestCanceled(
        tx,
        updated,
        userId,
      );

      return updated;
    });
  }

  async addBuildingComment(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
    dto: CreateRequestCommentDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (
        assignmentType === BuildingAssignmentType.STAFF &&
        request.assignedToUserId !== userId
      ) {
        throw new ForbiddenException('Forbidden');
      }

      const comment = await this.requestsRepo.createComment(
        {
          request: { connect: { id: request.id } },
          org: { connect: { id: orgId } },
          authorUser: { connect: { id: userId } },
          message: dto.message,
        },
        tx,
      );

      await this.notificationsService.notifyRequestCommented(
        tx,
        request,
        comment,
        userId,
        false,
      );

      return comment;
    });
  }

  async listBuildingComments(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const request = await this.requestsRepo.findByIdForBuilding(
      orgId,
      buildingId,
      requestId,
    );
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    if (
      assignmentType === BuildingAssignmentType.STAFF &&
      request.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    return this.requestsRepo.listComments(orgId, request.id);
  }

  async addBuildingAttachments(
    user: AuthenticatedUser | undefined,
    buildingId: string,
    requestId: string,
    dto: CreateRequestAttachmentsDto,
  ) {
    const orgId = assertOrgScope(user);
    const userId = user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.buildingAccessService.assertBuildingInOrg(buildingId, orgId);

    const assignmentType =
      await this.buildingAccessService.getBuildingAssignmentType(
        buildingId,
        userId,
      );

    return this.prisma.$transaction(async (tx) => {
      const request = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (
        request.status === MaintenanceRequestStatus.CANCELED ||
        request.status === MaintenanceRequestStatus.COMPLETED
      ) {
        throw new ConflictException('Request is closed');
      }

      if (
        assignmentType === BuildingAssignmentType.STAFF &&
        request.assignedToUserId !== userId
      ) {
        throw new ForbiddenException('Forbidden');
      }

      await this.requestsRepo.createAttachments(
        request.id,
        dto.attachments.map((attachment) => ({
          orgId,
          uploadedByUserId: userId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          url: attachment.url,
        })),
        tx,
      );

      const updated = await this.requestsRepo.findByIdForBuilding(
        orgId,
        buildingId,
        requestId,
        tx,
      );
      if (!updated) {
        throw new NotFoundException('Request not found');
      }
      return updated;
    });
  }

  private async hasGlobalPermission(userId: string, permission: string) {
    const effective = await this.accessControlService.getUserEffectivePermissions(
      userId,
    );
    return effective.has(permission);
  }

  private normalizePriority(
    value?: string,
  ): MaintenanceRequestPriority | undefined {
    if (!value) {
      return undefined;
    }
    switch (value) {
      case 'LOW':
        return MaintenanceRequestPriority.LOW;
      case 'MEDIUM':
        return MaintenanceRequestPriority.NORMAL;
      case 'HIGH':
        return MaintenanceRequestPriority.HIGH;
      default:
        return undefined;
    }
  }

  private normalizeType(value?: string): MaintenanceRequestType | undefined {
    if (!value) {
      return undefined;
    }
    switch (value) {
      case 'CLEANING':
        return MaintenanceRequestType.CLEANING;
      case 'ELECTRICAL':
        return MaintenanceRequestType.ELECTRICAL;
      case 'MAINTENANCE':
        return MaintenanceRequestType.MAINTENANCE;
      case 'PLUMBING_AC_HEATING':
        return MaintenanceRequestType.PLUMBING_AC_HEATING;
      case 'OTHER':
        return MaintenanceRequestType.OTHER;
      default:
        return undefined;
    }
  }
}
