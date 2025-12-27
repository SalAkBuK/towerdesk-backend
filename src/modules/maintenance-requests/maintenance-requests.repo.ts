import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DbClient } from '../../infra/prisma/db-client';
import { MaintenanceRequestStatusEnum } from './maintenance-requests.constants';

type AttachmentInput = {
  orgId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

@Injectable()
export class MaintenanceRequestsRepo {
  constructor(private readonly prisma: PrismaService) {}

  createRequest(data: Record<string, unknown>) {
    const prisma = this.prisma as any;
    return prisma.maintenanceRequest.create({
      data,
      include: {
        unit: true,
        assignedToUser: true,
        attachments: true,
      },
    });
  }

  createRequestWithAttachments(
    data: Record<string, unknown>,
    attachments: AttachmentInput[],
    tx?: DbClient,
  ) {
    if (tx) {
      const prisma = tx as any;
      return this.createRequestWithAttachmentsInTx(prisma, data, attachments);
    }

    const prisma = this.prisma as any;
    return prisma.$transaction(async (transaction: any) =>
      this.createRequestWithAttachmentsInTx(transaction, data, attachments),
    );
  }

  createAttachments(
    requestId: string,
    attachments: AttachmentInput[],
    tx?: DbClient,
  ) {
    if (attachments.length === 0) {
      return Promise.resolve();
    }
    const prisma = (tx ?? this.prisma) as any;
    return prisma.maintenanceRequestAttachment.createMany({
      data: attachments.map((attachment) => ({
        requestId,
        ...attachment,
      })),
    });
  }

  listByCreator(orgId: string, userId: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceRequest.findMany({
      where: { orgId, createdByUserId: userId },
      include: {
        unit: true,
        assignedToUser: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdForCreator(
    orgId: string,
    userId: string,
    requestId: string,
    tx?: DbClient,
  ) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.maintenanceRequest.findFirst({
      where: { id: requestId, orgId, createdByUserId: userId },
      include: {
        unit: true,
        assignedToUser: true,
        attachments: true,
      },
    });
  }

  updateById(requestId: string, data: Record<string, unknown>, tx?: DbClient) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.maintenanceRequest.update({
      where: { id: requestId },
      data,
      include: {
        unit: true,
        createdByUser: true,
        assignedToUser: true,
      },
    });
  }

  listByBuilding(
    orgId: string,
    buildingId: string,
    status?: MaintenanceRequestStatusEnum,
    assignedToUserId?: string,
  ) {
    const prisma = this.prisma as any;
    return prisma.maintenanceRequest.findMany({
      where: {
        orgId,
        buildingId,
        ...(status ? { status } : {}),
        ...(assignedToUserId ? { assignedToUserId } : {}),
      },
      include: {
        unit: true,
        createdByUser: true,
        assignedToUser: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdForBuilding(
    orgId: string,
    buildingId: string,
    requestId: string,
    tx?: DbClient,
  ) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.maintenanceRequest.findFirst({
      where: { id: requestId, orgId, buildingId },
      include: {
        unit: true,
        createdByUser: true,
        assignedToUser: true,
        attachments: true,
      },
    });
  }

  createComment(data: Record<string, unknown>, tx?: DbClient) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.maintenanceRequestComment.create({
      data,
      include: {
        authorUser: true,
      },
    });
  }

  listComments(orgId: string, requestId: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceRequestComment.findMany({
      where: { orgId, requestId },
      include: {
        authorUser: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAssignedActiveOccupancy(userId: string, tx?: DbClient) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.occupancy.findFirst({
      where: { residentUserId: userId, status: 'ACTIVE' },
      include: {
        building: true,
        unit: true,
      },
    });
  }

  findActiveOccupancyForUnit(unitId: string) {
    return this.prisma.occupancy.findFirst({
      where: { unitId, status: 'ACTIVE' },
    });
  }

  findUserById(userId: string, tx?: DbClient) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.user.findUnique({ where: { id: userId } });
  }

  findBuildingAssignment(buildingId: string, userId: string, tx?: DbClient) {
    const prisma = (tx ?? this.prisma) as any;
    return prisma.buildingAssignment.findFirst({
      where: {
        buildingId,
        userId,
        type: 'STAFF',
      },
    });
  }

  private async createRequestWithAttachmentsInTx(
    prisma: any,
    data: Record<string, unknown>,
    attachments: AttachmentInput[],
  ) {
    const request = await prisma.maintenanceRequest.create({
      data,
      include: {
        unit: true,
        assignedToUser: true,
        attachments: true,
      },
    });

    if (attachments.length > 0) {
      await prisma.maintenanceRequestAttachment.createMany({
        data: attachments.map((attachment) => ({
          requestId: request.id,
          ...attachment,
        })),
      });
    }

    return request;
  }
}
