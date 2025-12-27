import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { createValidationPipe } from '../src/common/pipes/validation.pipe';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../src/common/guards/org-scope.guard';
import { BuildingAccessGuard } from '../src/common/guards/building-access.guard';
import { BuildingAccessService } from '../src/common/building-access/building-access.service';
import { AccessControlService } from '../src/modules/access-control/access-control.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { MaintenanceRequestsRepo } from '../src/modules/maintenance-requests/maintenance-requests.repo';
import { MaintenanceRequestsService } from '../src/modules/maintenance-requests/maintenance-requests.service';
import { ResidentRequestsController } from '../src/modules/maintenance-requests/resident-requests.controller';
import { BuildingRequestsController } from '../src/modules/maintenance-requests/building-requests.controller';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

type OrgRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type MaintenanceRequestStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string | null;
  name?: string | null;
  orgId?: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BuildingRecord = {
  id: string;
  orgId: string;
  name: string;
  city: string;
  emirate?: string | null;
  country: string;
  timezone: string;
  floors?: number | null;
  unitsCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type UnitRecord = {
  id: string;
  buildingId: string;
  label: string;
  floor?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BuildingAssignmentRecord = {
  id: string;
  buildingId: string;
  userId: string;
  type: 'MANAGER' | 'STAFF' | 'BUILDING_ADMIN';
  createdAt: Date;
  updatedAt: Date;
};

type OccupancyRecord = {
  id: string;
  buildingId: string;
  unitId: string;
  residentUserId: string;
  status: 'ACTIVE' | 'ENDED';
  startAt: Date;
  endAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type RequestRecord = {
  id: string;
  orgId: string;
  buildingId: string;
  unitId?: string | null;
  createdByUserId: string;
  title: string;
  description?: string | null;
  status: MaintenanceRequestStatus;
  priority?: string | null;
  type?: string | null;
  assignedToUserId?: string | null;
  assignedAt?: Date | null;
  completedAt?: Date | null;
  canceledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CommentRecord = {
  id: string;
  requestId: string;
  orgId: string;
  authorUserId: string;
  message: string;
  createdAt: Date;
};

type AttachmentRecord = {
  id: string;
  requestId: string;
  orgId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: Date;
};

let prisma: InMemoryPrismaService;

class InMemoryPrismaService {
  private orgs: OrgRecord[] = [];
  private users: UserRecord[] = [];
  private buildings: BuildingRecord[] = [];
  private units: UnitRecord[] = [];
  private assignments: BuildingAssignmentRecord[] = [];
  private occupancies: OccupancyRecord[] = [];
  private requests: RequestRecord[] = [];
  private comments: CommentRecord[] = [];
  private attachments: AttachmentRecord[] = [];

  org = {
    create: async ({ data }: { data: { name: string } }) => {
      const now = new Date();
      const org: OrgRecord = {
        id: randomUUID(),
        name: data.name,
        createdAt: now,
        updatedAt: now,
      };
      this.orgs.push(org);
      return org;
    },
  };

  user = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; email?: string };
    }) => {
      if (where.id) {
        return this.users.find((user) => user.id === where.id) ?? null;
      }
      if (where.email) {
        return this.users.find((user) => user.email === where.email) ?? null;
      }
      return null;
    },
    create: async ({
      data,
    }: {
      data: {
        email: string;
        passwordHash: string;
        name?: string | null;
        orgId?: string | null;
        mustChangePassword?: boolean;
        isActive?: boolean;
      };
    }) => {
      const now = new Date();
      const user: UserRecord = {
        id: randomUUID(),
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        orgId: data.orgId ?? null,
        mustChangePassword: data.mustChangePassword ?? false,
        isActive: data.isActive ?? true,
        refreshTokenHash: null,
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(user);
      return user;
    },
  };

  building = {
    create: async ({
      data,
    }: {
      data: {
        orgId: string;
        name: string;
        city: string;
        emirate?: string | null;
        country: string;
        timezone: string;
        floors?: number | null;
        unitsCount?: number | null;
      };
    }) => {
      const now = new Date();
      const building: BuildingRecord = {
        id: randomUUID(),
        orgId: data.orgId,
        name: data.name,
        city: data.city,
        emirate: data.emirate ?? null,
        country: data.country,
        timezone: data.timezone,
        floors: data.floors ?? null,
        unitsCount: data.unitsCount ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.buildings.push(building);
      return building;
    },
    findFirst: async ({
      where,
    }: {
      where: { id: string; orgId: string };
    }) => {
      return (
        this.buildings.find(
          (building) =>
            building.id === where.id && building.orgId === where.orgId,
        ) ?? null
      );
    },
  };

  unit = {
    create: async ({
      data,
    }: {
      data: { buildingId: string; label: string };
    }) => {
      const now = new Date();
      const unit: UnitRecord = {
        id: randomUUID(),
        buildingId: data.buildingId,
        label: data.label,
        floor: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      };
      this.units.push(unit);
      return unit;
    },
    findFirst: async ({
      where,
    }: {
      where: { id?: string; buildingId: string };
    }) => {
      return (
        this.units.find(
          (unit) =>
            unit.buildingId === where.buildingId &&
            (where.id ? unit.id === where.id : true),
        ) ?? null
      );
    },
  };

  buildingAssignment = {
    findMany: async ({
      where,
    }: {
      where: { buildingId: string; userId: string };
    }) => {
      return this.assignments.filter(
        (assignment) =>
          assignment.buildingId === where.buildingId &&
          assignment.userId === where.userId,
      );
    },
    findFirst: async ({
      where,
    }: {
      where: { buildingId: string; userId: string; type: 'STAFF' };
    }) => {
      return (
        this.assignments.find(
          (assignment) =>
            assignment.buildingId === where.buildingId &&
            assignment.userId === where.userId &&
            assignment.type === where.type,
        ) ?? null
      );
    },
    create: async ({
      data,
    }: {
      data: { buildingId: string; userId: string; type: 'MANAGER' | 'STAFF' | 'BUILDING_ADMIN' };
    }) => {
      const now = new Date();
      const assignment: BuildingAssignmentRecord = {
        id: randomUUID(),
        buildingId: data.buildingId,
        userId: data.userId,
        type: data.type,
        createdAt: now,
        updatedAt: now,
      };
      this.assignments.push(assignment);
      return assignment;
    },
  };

  occupancy = {
    findFirst: async ({
      where,
      include,
    }: {
      where: {
        residentUserId?: string;
        unitId?: string;
        buildingId?: string;
        status: 'ACTIVE' | 'ENDED';
      };
      include?: { building?: boolean; unit?: boolean };
    }) => {
      const occupancy =
        this.occupancies.find(
          (occ) =>
            (where.residentUserId
              ? occ.residentUserId === where.residentUserId
              : true) &&
            (where.unitId ? occ.unitId === where.unitId : true) &&
            (where.buildingId ? occ.buildingId === where.buildingId : true) &&
            occ.status === where.status,
        ) ?? null;
      if (!occupancy) {
        return null;
      }
      return {
        ...occupancy,
        building: include?.building
          ? this.buildings.find((b) => b.id === occupancy.buildingId)
          : undefined,
        unit: include?.unit
          ? this.units.find((u) => u.id === occupancy.unitId)
          : undefined,
      };
    },
    create: async ({
      data,
    }: {
      data: {
        buildingId: string;
        unitId: string;
        residentUserId: string;
        status: 'ACTIVE' | 'ENDED';
      };
    }) => {
      const now = new Date();
      const occupancy: OccupancyRecord = {
        id: randomUUID(),
        buildingId: data.buildingId,
        unitId: data.unitId,
        residentUserId: data.residentUserId,
        status: data.status,
        startAt: now,
        endAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.occupancies.push(occupancy);
      return occupancy;
    },
  };

  maintenanceRequest = {
    create: async ({
      data,
      include,
    }: {
      data: {
        org: { connect: { id: string } };
        building: { connect: { id: string } };
        unit?: { connect: { id: string } } | null;
        createdByUser: { connect: { id: string } };
        title: string;
        description?: string | null;
        status: MaintenanceRequestStatus;
        priority?: string | null;
        type?: string | null;
      };
      include?: { unit?: boolean; assignedToUser?: boolean; attachments?: boolean; createdByUser?: boolean };
    }) => {
      const now = new Date();
      const request: RequestRecord = {
        id: randomUUID(),
        orgId: data.org.connect.id,
        buildingId: data.building.connect.id,
        unitId: data.unit?.connect.id ?? null,
        createdByUserId: data.createdByUser.connect.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority ?? null,
        type: data.type ?? null,
        assignedToUserId: null,
        assignedAt: null,
        completedAt: null,
        canceledAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.requests.push(request);
      return this.hydrateRequest(request, include);
    },
    findMany: async ({
      where,
      include,
      orderBy,
    }: {
      where: {
        orgId: string;
        buildingId?: string;
        createdByUserId?: string;
        assignedToUserId?: string;
        status?: MaintenanceRequestStatus;
      };
      include?: {
        unit?: boolean;
        createdByUser?: boolean;
        assignedToUser?: boolean;
        attachments?: boolean;
      };
      orderBy?: { createdAt: 'desc' };
    }) => {
      let results = this.requests.filter((req) => req.orgId === where.orgId);
      if (where.buildingId) {
        results = results.filter((req) => req.buildingId === where.buildingId);
      }
      if (where.createdByUserId) {
        results = results.filter(
          (req) => req.createdByUserId === where.createdByUserId,
        );
      }
      if (where.assignedToUserId) {
        results = results.filter(
          (req) => req.assignedToUserId === where.assignedToUserId,
        );
      }
      if (where.status) {
        results = results.filter((req) => req.status === where.status);
      }
      if (orderBy?.createdAt === 'desc') {
        results = [...results].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      }
      return results.map((req) => this.hydrateRequest(req, include));
    },
    findFirst: async ({
      where,
      include,
    }: {
      where: {
        id: string;
        orgId: string;
        buildingId?: string;
        createdByUserId?: string;
      };
      include?: {
        unit?: boolean;
        createdByUser?: boolean;
        assignedToUser?: boolean;
        attachments?: boolean;
      };
    }) => {
      const request =
        this.requests.find(
          (req) =>
            req.id === where.id &&
            req.orgId === where.orgId &&
            (where.buildingId ? req.buildingId === where.buildingId : true) &&
            (where.createdByUserId
              ? req.createdByUserId === where.createdByUserId
              : true),
        ) ?? null;
      if (!request) {
        return null;
      }
      return this.hydrateRequest(request, include);
    },
    update: async ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: {
        title?: string;
        description?: string | null;
        status?: MaintenanceRequestStatus;
        assignedAt?: Date | null;
        completedAt?: Date | null;
        canceledAt?: Date | null;
        assignedToUser?: { connect: { id: string } };
      };
      include?: { unit?: boolean; createdByUser?: boolean; assignedToUser?: boolean };
    }) => {
      const request = this.requests.find((req) => req.id === where.id);
      if (!request) {
        throw new Error('Request not found');
      }
      if (data.title !== undefined) {
        request.title = data.title;
      }
      if (data.description !== undefined) {
        request.description = data.description;
      }
      if (data.status) {
        request.status = data.status;
      }
      if (data.assignedToUser) {
        request.assignedToUserId = data.assignedToUser.connect.id;
      }
      if (data.assignedAt !== undefined) {
        request.assignedAt = data.assignedAt;
      }
      if (data.completedAt !== undefined) {
        request.completedAt = data.completedAt;
      }
      if (data.canceledAt !== undefined) {
        request.canceledAt = data.canceledAt;
      }
      request.updatedAt = new Date();
      return this.hydrateRequest(request, include);
    },
  };

  maintenanceRequestComment = {
    create: async ({
      data,
      include,
    }: {
      data: {
        request: { connect: { id: string } };
        org: { connect: { id: string } };
        authorUser: { connect: { id: string } };
        message: string;
      };
      include?: { authorUser?: boolean };
    }) => {
      const now = new Date();
      const comment: CommentRecord = {
        id: randomUUID(),
        requestId: data.request.connect.id,
        orgId: data.org.connect.id,
        authorUserId: data.authorUser.connect.id,
        message: data.message,
        createdAt: now,
      };
      this.comments.push(comment);
      return this.hydrateComment(comment, include);
    },
    findMany: async ({
      where,
      include,
      orderBy,
    }: {
      where: { orgId: string; requestId: string };
      include?: { authorUser?: boolean };
      orderBy?: { createdAt: 'asc' };
    }) => {
      let results = this.comments.filter(
        (comment) =>
          comment.orgId === where.orgId &&
          comment.requestId === where.requestId,
      );
      if (orderBy?.createdAt === 'asc') {
        results = [...results].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
      }
      return results.map((comment) => this.hydrateComment(comment, include));
    },
  };

  maintenanceRequestAttachment = {
    createMany: async ({
      data,
    }: {
      data: {
        requestId: string;
        orgId: string;
        uploadedByUserId: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
      }[];
    }) => {
      const now = new Date();
      for (const attachment of data) {
        const record: AttachmentRecord = {
          id: randomUUID(),
          requestId: attachment.requestId,
          orgId: attachment.orgId,
          uploadedByUserId: attachment.uploadedByUserId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          url: attachment.url,
          createdAt: now,
        };
        this.attachments.push(record);
      }
      return { count: data.length };
    },
  };

  async $transaction<T>(arg: ((tx: this) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(this);
  }

  private hydrateRequest(
    request: RequestRecord,
    include?: {
      unit?: boolean;
      createdByUser?: boolean;
      assignedToUser?: boolean;
      attachments?: boolean;
    },
  ) {
    return {
      ...request,
      unit: include?.unit
        ? this.units.find((unit) => unit.id === request.unitId) ?? null
        : undefined,
      createdByUser: include?.createdByUser
        ? this.users.find((user) => user.id === request.createdByUserId) ??
          null
        : undefined,
      assignedToUser: include?.assignedToUser
        ? this.users.find((user) => user.id === request.assignedToUserId) ??
          null
        : undefined,
      attachments: include?.attachments
        ? this.attachments.filter(
            (attachment) => attachment.requestId === request.id,
          )
        : undefined,
    };
  }

  private hydrateComment(
    comment: CommentRecord,
    include?: { authorUser?: boolean },
  ) {
    return {
      ...comment,
      authorUser: include?.authorUser
        ? this.users.find((user) => user.id === comment.authorUserId) ?? null
        : undefined,
    };
  }

  reset() {
    this.orgs = [];
    this.users = [];
    this.buildings = [];
    this.units = [];
    this.assignments = [];
    this.occupancies = [];
    this.requests = [];
    this.comments = [];
    this.attachments = [];
  }
}

@Injectable()
class TestAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userHeader = request.headers['x-user-id'];
    const userId = Array.isArray(userHeader) ? userHeader[0] : userHeader;
    if (!userId || typeof userId !== 'string') {
      return false;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return false;
    }

    request.user = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId ?? null,
    };
    return true;
  }
}

describe('Maintenance requests (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAdminA: UserRecord;
  let orgAdminB: UserRecord;
  let managerA: UserRecord;
  let buildingAdminA: UserRecord;
  let staffA: UserRecord;
  let residentA: UserRecord;
  let buildingA: BuildingRecord;
  let buildingB: BuildingRecord;
  let unitA1: UnitRecord;
  let unitA2: UnitRecord;

  const permissionsByUser = new Map<string, Set<string>>();

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [ResidentRequestsController, BuildingRequestsController],
      providers: [
        MaintenanceRequestsRepo,
        MaintenanceRequestsService,
        {
          provide: NotificationsService,
          useValue: {
            notifyRequestCreated: async () => undefined,
            notifyRequestAssigned: async () => undefined,
            notifyRequestStatusChanged: async () => undefined,
            notifyRequestCommented: async () => undefined,
            notifyRequestCanceled: async () => undefined,
          },
        },
        OrgScopeGuard,
        BuildingAccessService,
        BuildingAccessGuard,
        {
          provide: AccessControlService,
          useValue: {
            getUserEffectivePermissions: async (userId: string) =>
              permissionsByUser.get(userId) ?? new Set<string>(),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    prisma.reset();
    permissionsByUser.clear();

    const orgA = await prisma.org.create({ data: { name: 'Org A' } });
    const orgB = await prisma.org.create({ data: { name: 'Org B' } });

    buildingA = await prisma.building.create({
      data: {
        orgId: orgA.id,
        name: 'A1',
        city: 'Dubai',
        emirate: 'Dubai',
        country: 'ARE',
        timezone: 'Asia/Dubai',
      },
    });
    buildingB = await prisma.building.create({
      data: {
        orgId: orgB.id,
        name: 'B1',
        city: 'Abu Dhabi',
        emirate: 'Abu Dhabi',
        country: 'ARE',
        timezone: 'Asia/Dubai',
      },
    });

    unitA1 = await prisma.unit.create({
      data: { buildingId: buildingA.id, label: 'A-101' },
    });
    unitA2 = await prisma.unit.create({
      data: { buildingId: buildingA.id, label: 'A-102' },
    });

    orgAdminA = await prisma.user.create({
      data: {
        email: 'org-admin-a@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Org Admin A',
        isActive: true,
      },
    });
    orgAdminB = await prisma.user.create({
      data: {
        email: 'org-admin-b@org.test',
        passwordHash: 'hash',
        orgId: orgB.id,
        name: 'Org Admin B',
        isActive: true,
      },
    });
    managerA = await prisma.user.create({
      data: {
        email: 'manager@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Manager A',
        isActive: true,
      },
    });
    buildingAdminA = await prisma.user.create({
      data: {
        email: 'building-admin@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Building Admin A',
        isActive: true,
      },
    });
    staffA = await prisma.user.create({
      data: {
        email: 'staff@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Staff A',
        isActive: true,
      },
    });
    residentA = await prisma.user.create({
      data: {
        email: 'resident@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Resident A',
        isActive: true,
      },
    });

    permissionsByUser.set(
      orgAdminA.id,
      new Set([
        'requests.read',
        'requests.assign',
        'requests.update_status',
        'requests.comment',
      ]),
    );
    permissionsByUser.set(
      orgAdminB.id,
      new Set([
        'requests.read',
        'requests.assign',
        'requests.update_status',
        'requests.comment',
      ]),
    );

    await prisma.buildingAssignment.create({
      data: { buildingId: buildingA.id, userId: managerA.id, type: 'MANAGER' },
    });
    await prisma.buildingAssignment.create({
      data: {
        buildingId: buildingA.id,
        userId: buildingAdminA.id,
        type: 'BUILDING_ADMIN',
      },
    });
    await prisma.buildingAssignment.create({
      data: { buildingId: buildingA.id, userId: staffA.id, type: 'STAFF' },
    });

    await prisma.occupancy.create({
      data: {
        buildingId: buildingA.id,
        unitId: unitA1.id,
        residentUserId: residentA.id,
        status: 'ACTIVE',
      },
    });
  });

  it('resident creates and reads requests', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({
        title: 'Leaky faucet',
        description: 'Kitchen sink dripping',
        attachments: [
          {
            fileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1234,
            url: 'https://example.com/photo.jpg',
          },
        ],
      }),
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.status).toBe('OPEN');
    expect(created.unit.id).toBe(unitA1.id);

    const listResponse = await fetch(`${baseUrl}/resident/requests`, {
      headers: { 'x-user-id': residentA.id },
    });
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody).toHaveLength(1);

    const detailResponse = await fetch(
      `${baseUrl}/resident/requests/${created.id}`,
      { headers: { 'x-user-id': residentA.id } },
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody.id).toBe(created.id);
  });

  it('cross-org access returns 404', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Noise', description: 'Loud AC' }),
    });
    const created = await createResponse.json();

    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}`,
      { headers: { 'x-user-id': orgAdminB.id } },
    );
    expect(response.status).toBe(404);
  });

  it('staff only sees assigned requests by default', async () => {
    await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Light out' }),
    });

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests`,
      { headers: { 'x-user-id': staffA.id } },
    );
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody).toHaveLength(0);
  });

  it('manager and building admin can assign requests', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Door jammed' }),
    });
    const created = await createResponse.json();

    const managerAssign = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );
    expect(managerAssign.status).toBe(201);

    const secondResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Broken window' }),
    });
    const second = await secondResponse.json();

    const buildingAdminAssign = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${second.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );
    expect(buildingAdminAssign.status).toBe(201);
  });

  it('manager can reassign an assigned request', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Reassign test' }),
    });
    const created = await createResponse.json();

    const firstAssign = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );
    expect(firstAssign.status).toBe(201);

    const otherStaff = await prisma.user.create({
      data: {
        email: 'staff2@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Staff B',
        isActive: true,
      },
    });

    await prisma.buildingAssignment.create({
      data: { buildingId: buildingA.id, userId: otherStaff.id, type: 'STAFF' },
    });

    const secondAssign = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({ staffUserId: otherStaff.id }),
      },
    );
    expect(secondAssign.status).toBe(201);
  });

  it('staff updates status only when assigned', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'AC noise' }),
    });
    const created = await createResponse.json();

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );

    const inProgress = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      },
    );
    expect(inProgress.status).toBe(201);

    const completed = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      },
    );
    expect(completed.status).toBe(201);
  });

  it('manager can update status without permission', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Elevator stuck' }),
    });
    const created = await createResponse.json();

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );

    const managerDenied = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      },
    );
    expect(managerDenied.status).toBe(201);
  });

  it('manager can cancel requests', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Cancel test' }),
    });
    const created = await createResponse.json();

    const cancelResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
      },
    );
    expect(cancelResponse.status).toBe(201);
    const cancelBody = await cancelResponse.json();
    expect(cancelBody.status).toBe('CANCELED');
  });

  it('comments respect assignment rules', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Hallway light' }),
    });
    const created = await createResponse.json();

    const residentComment = await fetch(
      `${baseUrl}/resident/requests/${created.id}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': residentA.id,
        },
        body: JSON.stringify({ message: 'Please fix soon' }),
      },
    );
    expect(residentComment.status).toBe(201);

    const staffCommentDenied = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ message: 'Checking' }),
      },
    );
    expect(staffCommentDenied.status).toBe(403);

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );

    const staffComment = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${created.id}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ message: 'Assigned and working' }),
      },
    );
    expect(staffComment.status).toBe(201);
  });

  it('resident can cancel open request but not completed', async () => {
    const createResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Noise in lobby' }),
    });
    const created = await createResponse.json();

    const cancelResponse = await fetch(
      `${baseUrl}/resident/requests/${created.id}/cancel`,
      {
        method: 'POST',
        headers: { 'x-user-id': residentA.id },
      },
    );
    expect(cancelResponse.status).toBe(201);

    const secondResponse = await fetch(`${baseUrl}/resident/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': residentA.id,
      },
      body: JSON.stringify({ title: 'Broken pipe' }),
    });
    const second = await secondResponse.json();

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${second.id}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ staffUserId: staffA.id }),
      },
    );

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${second.id}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      },
    );

    await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/requests/${second.id}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      },
    );

    const cancelCompleted = await fetch(
      `${baseUrl}/resident/requests/${second.id}/cancel`,
      {
        method: 'POST',
        headers: { 'x-user-id': residentA.id },
      },
    );
    expect(cancelCompleted.status).toBe(409);
  });
});
