import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { createValidationPipe } from '../src/common/pipes/validation.pipe';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { OrgScopeGuard } from '../src/common/guards/org-scope.guard';
import { BuildingAccessGuard } from '../src/common/guards/building-access.guard';
import { PlatformAuthGuard } from '../src/common/guards/platform-auth.guard';
import { AccessControlService } from '../src/modules/access-control/access-control.service';
import { BuildingsController } from '../src/modules/buildings/buildings.controller';
import { BuildingsRepo } from '../src/modules/buildings/buildings.repo';
import { BuildingsService } from '../src/modules/buildings/buildings.service';
import { PlatformOrgsController } from '../src/modules/platform/platform-orgs.controller';
import { PlatformOrgsService } from '../src/modules/platform/platform-orgs.service';
import { UnitsController } from '../src/modules/units/units.controller';
import { UnitsRepo } from '../src/modules/units/units.repo';
import { UnitsService } from '../src/modules/units/units.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { BuildingAssignmentsController } from '../src/modules/building-assignments/building-assignments.controller';
import { BuildingAssignmentsRepo } from '../src/modules/building-assignments/building-assignments.repo';
import { BuildingAssignmentsService } from '../src/modules/building-assignments/building-assignments.service';
import { UsersRepo } from '../src/modules/users/users.repo';
import { OccupanciesController } from '../src/modules/occupancies/occupancies.controller';
import { OccupanciesRepo } from '../src/modules/occupancies/occupancies.repo';
import { OccupanciesService } from '../src/modules/occupancies/occupancies.service';

type OrgRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

type UserRoleRecord = {
  userId: string;
  roleId: string;
  createdAt: Date;
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

type BuildingAmenityRecord = {
  id: string;
  buildingId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UnitAmenityRecord = {
  unitId: string;
  amenityId: string;
  createdAt: Date;
};

type BuildingAssignmentRecord = {
  id: string;
  buildingId: string;
  userId: string;
  type: 'MANAGER' | 'STAFF';
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

let prisma: InMemoryPrismaService;

class InMemoryPrismaService {
  private orgs: OrgRecord[] = [];
  private roles: RoleRecord[] = [];
  private users: UserRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private buildings: BuildingRecord[] = [];
  private buildingAmenities: BuildingAmenityRecord[] = [];
  private unitAmenities: UnitAmenityRecord[] = [];
  private units: UnitRecord[] = [];
  private assignments: BuildingAssignmentRecord[] = [];
  private occupancies: OccupancyRecord[] = [];

  org = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.orgs.find((org) => org.id === where.id) ?? null;
    },
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

  role = {
    findUnique: async ({ where }: { where: { key: string } }) => {
      return this.roles.find((role) => role.key === where.key) ?? null;
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
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<UserRecord>;
    }) => {
      const user = this.users.find((record) => record.id === where.id);
      if (!user) {
        throw new Error('User not found');
      }
      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    },
  };

  userRole = {
    create: async ({
      data,
    }: {
      data: { userId: string; roleId: string };
    }) => {
      const record: UserRoleRecord = {
        userId: data.userId,
        roleId: data.roleId,
        createdAt: new Date(),
      };
      this.userRoles.push(record);
      return record;
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
    findMany: async ({ where }: { where: { orgId: string } }) => {
      return this.buildings.filter((building) => building.orgId === where.orgId);
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
      data: {
        buildingId: string;
        label: string;
        floor?: number;
        notes?: string;
      };
    }) => {
      const exists = this.units.find(
        (unit) =>
          unit.buildingId === data.buildingId && unit.label === data.label,
      );
      if (exists) {
        const error = new Error('Unique constraint failed');
        (error as { code?: string }).code = 'P2002';
        throw error;
      }

      const now = new Date();
      const unit: UnitRecord = {
        id: randomUUID(),
        buildingId: data.buildingId,
        label: data.label,
        floor: data.floor ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.units.push(unit);
      return unit;
    },
    findMany: async ({
      where,
    }: {
      where: {
        buildingId: string;
        occupancies?: { none: { status: 'ACTIVE' } };
      };
    }) => {
      let results = this.units.filter(
        (unit) => unit.buildingId === where.buildingId,
      );
      if (where.occupancies?.none?.status === 'ACTIVE') {
        const occupiedUnitIds = new Set(
          this.occupancies
            .filter((occ) => occ.status === 'ACTIVE')
            .map((occ) => occ.unitId),
        );
        results = results.filter((unit) => !occupiedUnitIds.has(unit.id));
      }
      return results;
    },
    count: async ({
      where,
    }: {
      where: {
        buildingId: string;
        occupancies?: { none: { status: 'ACTIVE' } };
      };
    }) => {
      let results = this.units.filter(
        (unit) => unit.buildingId === where.buildingId,
      );
      if (where.occupancies?.none?.status === 'ACTIVE') {
        const occupiedUnitIds = new Set(
          this.occupancies
            .filter((occ) => occ.status === 'ACTIVE')
            .map((occ) => occ.unitId),
        );
        results = results.filter((unit) => !occupiedUnitIds.has(unit.id));
      }
      return results.length;
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
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.units.find((unit) => unit.id === where.id) ?? null;
    },
  };

  buildingAmenity = {
    findMany: async ({
      where,
      select,
    }: {
      where: { buildingId: string; isActive?: boolean; isDefault?: boolean; id?: { in: string[] } };
      select?: { id?: boolean };
    }) => {
      const items = this.buildingAmenities.filter((amenity) => {
        if (amenity.buildingId !== where.buildingId) return false;
        if (where.isActive !== undefined && amenity.isActive !== where.isActive) return false;
        if (where.isDefault !== undefined && amenity.isDefault !== where.isDefault) return false;
        if (where.id?.in && !where.id.in.includes(amenity.id)) return false;
        return true;
      });
      if (select?.id) {
        return items.map((amenity) => ({ id: amenity.id }));
      }
      return items;
    },
  };

  unitAmenity = {
    createMany: async ({
      data,
    }: {
      data: { unitId: string; amenityId: string }[];
      skipDuplicates?: boolean;
    }) => {
      for (const entry of data) {
        const exists = this.unitAmenities.some(
          (link) => link.unitId === entry.unitId && link.amenityId === entry.amenityId,
        );
        if (exists) {
          continue;
        }
        this.unitAmenities.push({
          unitId: entry.unitId,
          amenityId: entry.amenityId,
          createdAt: new Date(),
        });
      }
      return { count: data.length };
    },
    deleteMany: async ({ where }: { where: { unitId: string } }) => {
      const before = this.unitAmenities.length;
      this.unitAmenities = this.unitAmenities.filter(
        (link) => link.unitId !== where.unitId,
      );
      return { count: before - this.unitAmenities.length };
    },
  };

  buildingAssignment = {
    create: async ({
      data,
      include,
    }: {
      data: { buildingId: string; userId: string; type: 'MANAGER' | 'STAFF' };
      include?: { user?: boolean };
    }) => {
      const exists = this.assignments.find(
        (assignment) =>
          assignment.buildingId === data.buildingId &&
          assignment.userId === data.userId &&
          assignment.type === data.type,
      );
      if (exists) {
        const error = new Error('Unique constraint failed');
        (error as { code?: string }).code = 'P2002';
        throw error;
      }

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

      if (include?.user) {
        const user = this.users.find((u) => u.id === data.userId);
        return { ...assignment, user };
      }

      return assignment;
    },
    findMany: async ({
      where,
      include,
    }: {
      where: { buildingId: string };
      include?: { user?: boolean };
    }) => {
      const assignments = this.assignments.filter(
        (assignment) => assignment.buildingId === where.buildingId,
      );
      if (!include?.user) {
        return assignments;
      }
      return assignments.map((assignment) => ({
        ...assignment,
        user: this.users.find((user) => user.id === assignment.userId),
      }));
    },
  };

  occupancy = {
    findFirst: async ({
      where,
    }: {
      where: { unitId: string; status: 'ACTIVE' };
    }) => {
      return (
        this.occupancies.find(
          (occ) => occ.unitId === where.unitId && occ.status === where.status,
        ) ?? null
      );
    },
    findMany: async ({
      where,
      include,
    }: {
      where: { buildingId: string; status: 'ACTIVE' };
      include?: { unit?: boolean; residentUser?: boolean };
    }) => {
      const occupancies = this.occupancies.filter(
        (occ) =>
          occ.buildingId === where.buildingId && occ.status === where.status,
      );
      if (!include) {
        return occupancies;
      }
      return occupancies.map((occ) => ({
        ...occ,
        unit: include.unit
          ? this.units.find((unit) => unit.id === occ.unitId)
          : undefined,
        residentUser: include.residentUser
          ? this.users.find((user) => user.id === occ.residentUserId)
          : undefined,
      }));
    },
    count: async ({
      where,
    }: {
      where: { buildingId: string; status: 'ACTIVE' };
    }) => {
      return this.occupancies.filter(
        (occ) =>
          occ.buildingId === where.buildingId && occ.status === where.status,
      ).length;
    },
    create: async ({
      data,
      include,
    }: {
      data: {
        buildingId: string;
        unitId: string;
        residentUserId: string;
        status: 'ACTIVE' | 'ENDED';
      };
      include?: { unit?: boolean; residentUser?: boolean };
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

      if (!include) {
        return occupancy;
      }
      return {
        ...occupancy,
        unit: include.unit
          ? this.units.find((unit) => unit.id === occupancy.unitId)
          : undefined,
        residentUser: include.residentUser
          ? this.users.find((user) => user.id === occupancy.residentUserId)
          : undefined,
      };
    },
  };

  async $transaction<T>(arg: ((tx: this) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(this);
  }

  reset() {
    this.orgs = [];
    this.roles = [];
    this.users = [];
    this.userRoles = [];
    this.buildings = [];
    this.buildingAmenities = [];
    this.unitAmenities = [];
    this.units = [];
    this.assignments = [];
    this.occupancies = [];
  }

  seedOrgAdminRole() {
    const now = new Date();
    this.roles.push({
      id: randomUUID(),
      key: 'org_admin',
      name: 'Org Admin',
      description: 'Org administrator',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });
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

@Injectable()
class AllowPermissionsGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

describe('Org assignments and occupancy (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAAdminId: string;
  let orgBAdminId: string;
  let buildingId: string;
  let unit1Id: string;
  let unit2Id: string;

  const platformKey = process.env.PLATFORM_API_KEY ?? 'test-platform-key';

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [
        PlatformOrgsController,
        BuildingsController,
        UnitsController,
        BuildingAssignmentsController,
        OccupanciesController,
      ],
      providers: [
        PlatformOrgsService,
        BuildingsService,
        BuildingsRepo,
        UnitsService,
        UnitsRepo,
        BuildingAssignmentsService,
        BuildingAssignmentsRepo,
        OccupanciesService,
        OccupanciesRepo,
        UsersRepo,
        OrgScopeGuard,
        PlatformAuthGuard,
        {
          provide: AccessControlService,
          useValue: {
            getUserEffectivePermissions: async () => new Set<string>(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useClass(AllowPermissionsGuard)
      .overrideGuard(BuildingAccessGuard)
      .useClass(AllowPermissionsGuard)
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
    prisma.seedOrgAdminRole();

    const orgAResponse = await fetch(`${baseUrl}/platform/orgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-platform-key': platformKey,
      },
      body: JSON.stringify({ name: 'Org A' }),
    });
    const orgABody = await orgAResponse.json();

    const orgBResponse = await fetch(`${baseUrl}/platform/orgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-platform-key': platformKey,
      },
      body: JSON.stringify({ name: 'Org B' }),
    });
    const orgBBody = await orgBResponse.json();

    const orgAAdminResponse = await fetch(
      `${baseUrl}/platform/orgs/${orgABody.id}/admins`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform-key': platformKey,
        },
        body: JSON.stringify({
          name: 'Org A Admin',
          email: 'admin-a@org.test',
        }),
      },
    );
    const orgAAdminBody = await orgAAdminResponse.json();
    orgAAdminId = orgAAdminBody.userId;

    const orgBAdminResponse = await fetch(
      `${baseUrl}/platform/orgs/${orgBBody.id}/admins`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform-key': platformKey,
        },
        body: JSON.stringify({
          name: 'Org B Admin',
          email: 'admin-b@org.test',
        }),
      },
    );
    const orgBAdminBody = await orgBAdminResponse.json();
    orgBAdminId = orgBAdminBody.userId;

    const buildingResponse = await fetch(`${baseUrl}/org/buildings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAAdminId,
      },
      body: JSON.stringify({ name: 'Alpha Tower', city: 'Dubai' }),
    });
    const buildingBody = await buildingResponse.json();
    buildingId = buildingBody.id;

    const unit1Response = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ label: 'A-101' }),
      },
    );
    const unit1Body = await unit1Response.json();
    unit1Id = unit1Body.id;

    const unit2Response = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ label: 'A-102' }),
      },
    );
    const unit2Body = await unit2Response.json();
    unit2Id = unit2Body.id;
  });

  it('assigns a manager and lists assignments', async () => {
    const manager = await prisma.user.create({
      data: {
        email: 'manager@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Manager One',
        isActive: true,
      },
    });

    const assignResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ userId: manager.id, type: 'MANAGER' }),
      },
    );

    expect(assignResponse.status).toBe(201);
    const assignBody = await assignResponse.json();
    expect(assignBody.user.id).toBe(manager.id);

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        headers: { 'x-user-id': orgAAdminId },
      },
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody).toHaveLength(1);
  });

  it('blocks cross-org assignment access', async () => {
    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        headers: { 'x-user-id': orgBAdminId },
      },
    );
    expect(listResponse.status).toBe(404);

    const assignResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgBAdminId,
        },
        body: JSON.stringify({ userId: orgBAdminId, type: 'MANAGER' }),
      },
    );
    expect(assignResponse.status).toBe(404);
  });

  it('rejects assignment for user outside the org', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: 'outside@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgBAdminId } }))
          ?.orgId,
        name: 'Outside User',
        isActive: true,
      },
    });

    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ userId: otherUser.id, type: 'STAFF' }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('returns 409 on duplicate assignment', async () => {
    const staff = await prisma.user.create({
      data: {
        email: 'staff@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Staff User',
        isActive: true,
      },
    });

    await fetch(`${baseUrl}/org/buildings/${buildingId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAAdminId,
      },
      body: JSON.stringify({ userId: staff.id, type: 'STAFF' }),
    });

    const duplicate = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ userId: staff.id, type: 'STAFF' }),
      },
    );

    expect(duplicate.status).toBe(409);
  });

  it('filters available units and enforces occupancy rules', async () => {
    const listInitial = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units?available=true`,
      {
        headers: { 'x-user-id': orgAAdminId },
      },
    );

    expect(listInitial.status).toBe(200);
    const listInitialBody = await listInitial.json();
    expect(listInitialBody).toHaveLength(2);

    const resident = await prisma.user.create({
      data: {
        email: 'resident@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Resident One',
        isActive: true,
      },
    });

    const occupancyResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ unitId: unit1Id, residentUserId: resident.id }),
      },
    );

    expect(occupancyResponse.status).toBe(201);

    const listAfter = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units?available=true`,
      {
        headers: { 'x-user-id': orgAAdminId },
      },
    );

    expect(listAfter.status).toBe(200);
    const listAfterBody = await listAfter.json();
    expect(listAfterBody).toHaveLength(1);
    expect(listAfterBody[0].id).toBe(unit2Id);

    const orgBAccess = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units?available=true`,
      {
        headers: { 'x-user-id': orgBAdminId },
      },
    );
    expect(orgBAccess.status).toBe(404);

    const duplicateOccupancy = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ unitId: unit1Id, residentUserId: resident.id }),
      },
    );
    expect(duplicateOccupancy.status).toBe(409);
  });

  it('returns active occupancy count for a building', async () => {
    const initialCount = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies/count`,
      { headers: { 'x-user-id': orgAAdminId } },
    );
    expect(initialCount.status).toBe(200);
    const initialBody = await initialCount.json();
    expect(initialBody).toEqual({ active: 0 });

    const resident = await prisma.user.create({
      data: {
        email: 'count@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Count Resident',
        isActive: true,
      },
    });

    const occupancyResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ unitId: unit1Id, residentUserId: resident.id }),
      },
    );
    expect(occupancyResponse.status).toBe(201);

    const countResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies/count`,
      { headers: { 'x-user-id': orgAAdminId } },
    );
    expect(countResponse.status).toBe(200);
    const countBody = await countResponse.json();
    expect(countBody).toEqual({ active: 1 });
  });

  it('returns vacant unit count for a building', async () => {
    const initialCount = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units/count`,
      { headers: { 'x-user-id': orgAAdminId } },
    );
    expect(initialCount.status).toBe(200);
    const initialBody = await initialCount.json();
    expect(initialBody).toEqual({ total: 2, vacant: 2 });

    const resident = await prisma.user.create({
      data: {
        email: 'vacant@org.test',
        passwordHash: 'hash',
        orgId: (await prisma.user.findUnique({ where: { id: orgAAdminId } }))
          ?.orgId,
        name: 'Vacant Resident',
        isActive: true,
      },
    });

    const occupancyResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/occupancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ unitId: unit2Id, residentUserId: resident.id }),
      },
    );
    expect(occupancyResponse.status).toBe(201);

    const countResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units/count`,
      { headers: { 'x-user-id': orgAAdminId } },
    );
    expect(countResponse.status).toBe(200);
    const countBody = await countResponse.json();
    expect(countBody).toEqual({ total: 2, vacant: 1 });
  });
});
