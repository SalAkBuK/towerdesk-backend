import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MaintenanceRequestSnapshot } from '../maintenance-requests/maintenance-requests.events';

@Injectable()
export class NotificationRecipientResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForRequestCreated(
    request: MaintenanceRequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = await this.resolveOpsRecipients(
      request.orgId,
      request.buildingId,
    );
    return this.finalizeRecipients(recipients, actorUserId);
  }

  async resolveForRequestAssigned(
    request: MaintenanceRequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = new Set<string>();
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }
    recipients.add(request.createdByUserId);

    const opsRecipients = await this.resolveOpsRecipients(
      request.orgId,
      request.buildingId,
    );
    opsRecipients.forEach((id) => recipients.add(id));

    return this.finalizeRecipients(recipients, actorUserId);
  }

  async resolveForRequestStatusChanged(
    request: MaintenanceRequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = new Set<string>([request.createdByUserId]);
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }

    const opsRecipients = await this.resolveOpsRecipients(
      request.orgId,
      request.buildingId,
    );
    opsRecipients.forEach((id) => recipients.add(id));
    return this.finalizeRecipients(recipients, actorUserId);
  }

  async resolveForRequestCommented(
    request: MaintenanceRequestSnapshot,
    actorUserId: string,
    actorIsResident: boolean,
  ) {
    const recipients = new Set<string>([request.createdByUserId]);
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }

    const opsRecipients = await this.resolveOpsRecipients(
      request.orgId,
      request.buildingId,
    );
    opsRecipients.forEach((id) => recipients.add(id));

    return this.finalizeRecipients(recipients, actorUserId);
  }

  async resolveForRequestCanceled(
    request: MaintenanceRequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = await this.resolveOpsRecipients(
      request.orgId,
      request.buildingId,
    );
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }
    return this.finalizeRecipients(recipients, actorUserId);
  }

  private async resolveOpsRecipients(orgId: string, buildingId: string) {
    let recipients = await this.getBuildingManagersAndAdmins(orgId, buildingId);

    if (recipients.size === 0) {
      recipients = await this.getOrgAdmins(orgId);
      // TODO: Expand recipient resolution once more org-level roles are defined.
    }

    return recipients;
  }

  private async getBuildingManagersAndAdmins(orgId: string, buildingId: string) {
    const assignments = await this.prisma.buildingAssignment.findMany({
      where: {
        buildingId,
        type: { in: ['MANAGER', 'BUILDING_ADMIN'] },
      },
      include: { user: true },
    });

    const recipients = new Set<string>();
    for (const assignment of assignments) {
      const user = assignment.user;
      if (user && user.isActive && user.orgId === orgId) {
        recipients.add(assignment.userId);
      }
    }
    return recipients;
  }

  private async getOrgAdmins(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        orgId,
        isActive: true,
        userRoles: {
          some: {
            role: { key: { in: ['org_admin', 'admin'] } },
          },
        },
      },
    });
    return new Set(users.map((user) => user.id));
  }

  private finalizeRecipients(recipients: Set<string>, actorUserId: string) {
    recipients.delete(actorUserId);
    if (recipients.size === 0) {
      recipients.add(actorUserId);
    }
    return recipients;
  }
}
