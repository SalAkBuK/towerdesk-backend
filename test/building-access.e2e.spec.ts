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
import { BuildingsController } from '../src/modules/buildings/buildings.controller';
import { BuildingsRepo } from '../src/modules/buildings/buildings.repo';
import { BuildingsService } from '../src/modules/buildings/buildings.service';
import { UnitsController } from '../src/modules/units/units.controller';
import { UnitsRepo } from '../src/modules/units/units.repo';
import { UnitsService } from '../src/modules/units/units.service';
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

let prisma: InMemoryPrismaService;

class InMemoryPrismaService {
  private orgs: OrgRecord[] = [];
  private users: UserRecord[] = [];
  private buildings: BuildingRecord[] = [];
  private buildingAmenities: BuildingAmenityRecord[] = [];
  private unitAmenities: UnitAmenityRecord[] = [];
  private units: UnitRecord[] = [];
  private assignments: BuildingAssignmentRecord[] = [];
  private occupancies: OccupancyRecord[] = [];

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
    findMany: async ({
      where,
    }: {
      where: {
        orgId?: string;
        assignments?: { some: { userId: string } };
      };
    }) => {
      let results = this.buildings.slice();
      if (where.orgId) {
        results = results.filter((building) => building.orgId === where.orgId);
      }
      const userId = where.assignments?.some?.userId;
      if (userId) {
        const buildingIds = new Set(
          this.assignments
            .filter((assignment) => assignment.userId === userId)
            .map((assignment) => assignment.buildingId),
        );
        results = results.filter((building) => buildingIds.has(building.id));
      }
      return results;
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
        const occupied = new Set(
          this.occupancies
            .filter((occ) => occ.status === 'ACTIVE')
            .map((occ) => occ.unitId),
        );
        results = results.filter((unit) => !occupied.has(unit.id));
      }
      return results;
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
    create: async ({
      data,
      include,
    }: {
      data: { buildingId: string; userId: string; type: 'MANAGER' | 'STAFF' | 'BUILDING_ADMIN' };
      include?: { user?: boolean };
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
      if (include?.user) {
        const user = this.users.find((record) => record.id === data.userId);
        return { ...assignment, user };
      }
      return assignment;
    },
  };

  occupancy = {
    findFirst: async ({
      where,
    }: {
      where: { unitId?: string; buildingId?: string; residentUserId?: string; status: 'ACTIVE' };
    }) => {
      return (
        this.occupancies.find(
          (occ) =>
            (where.unitId ? occ.unitId === where.unitId : true) &&
            (where.buildingId ? occ.buildingId === where.buildingId : true) &&
            (where.residentUserId ? occ.residentUserId === where.residentUserId : true) &&
            occ.status === where.status,
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

  async $transaction<T>(arg: ((tx: this) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(this);
  }

  reset() {
    this.orgs = [];
    this.users = [];
    this.buildings = [];
    this.buildingAmenities = [];
    this.unitAmenities = [];
    this.units = [];
    this.assignments = [];
    this.occupancies = [];
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

describe('Building-scoped access (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAdminA: UserRecord;
  let orgAdminB: UserRecord;
  let staffA: UserRecord;
  let managerA: UserRecord;
  let buildingAdminA: UserRecord;
  let residentA: UserRecord;
  let plainA: UserRecord;
  let buildingA: BuildingRecord;
  let buildingB: BuildingRecord;
  let unit1: UnitRecord;
  let unit2: UnitRecord;

  const permissionsByUser = new Map<string, Set<string>>();
  const orgAdminPermissions = new Set([
    'buildings.read',
    'buildings.write',
    'units.read',
    'units.write',
    'building.assignments.read',
    'building.assignments.write',
    'occupancy.read',
    'occupancy.write',
  ]);

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [
        BuildingsController,
        UnitsController,
        BuildingAssignmentsController,
        OccupanciesController,
      ],
      providers: [
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

    unit1 = await prisma.unit.create({
      data: { buildingId: buildingA.id, label: 'A-101' },
    });
    unit2 = await prisma.unit.create({
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
    staffA = await prisma.user.create({
      data: {
        email: 'staff@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Staff A',
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
    residentA = await prisma.user.create({
      data: {
        email: 'resident@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Resident A',
        isActive: true,
      },
    });
    plainA = await prisma.user.create({
      data: {
        email: 'plain@org.test',
        passwordHash: 'hash',
        orgId: orgA.id,
        name: 'Plain A',
        isActive: true,
      },
    });

    permissionsByUser.set(orgAdminA.id, new Set(orgAdminPermissions));
    permissionsByUser.set(orgAdminB.id, new Set(orgAdminPermissions));

    await prisma.buildingAssignment.create({
      data: { buildingId: buildingA.id, userId: staffA.id, type: 'STAFF' },
    });
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
  });

  it('returns 404 for cross-org access before auth checks', async () => {
    const response = await fetch(`${baseUrl}/org/buildings/${buildingA.id}`, {
      headers: { 'x-user-id': orgAdminB.id },
    });
    expect(response.status).toBe(404);
  });

  it('global org admin can read and write building resources', async () => {
    const detail = await fetch(`${baseUrl}/org/buildings/${buildingA.id}`, {
      headers: { 'x-user-id': orgAdminA.id },
    });
    expect(detail.status).toBe(200);

    const createUnit = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAdminA.id,
        },
        body: JSON.stringify({ label: 'A-103' }),
      },
    );
    expect(createUnit.status).toBe(201);
  });

  it('staff have read access but not write; managers can add units', async () => {
    const staffDetail = await fetch(`${baseUrl}/org/buildings/${buildingA.id}`, {
      headers: { 'x-user-id': staffA.id },
    });
    expect(staffDetail.status).toBe(200);

    const managerUnits = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units`,
      { headers: { 'x-user-id': managerA.id } },
    );
    expect(managerUnits.status).toBe(200);

    const staffCreateUnit = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({ label: 'A-104' }),
      },
    );
    expect(staffCreateUnit.status).toBe(403);

    const managerCreateUnit = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({ label: 'A-105' }),
      },
    );
    expect(managerCreateUnit.status).toBe(201);
  });

  it('building admin can write building resources', async () => {
    const createUnit = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ label: 'A-105' }),
      },
    );
    expect(createUnit.status).toBe(201);

    const assignResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ userId: staffA.id, type: 'STAFF' }),
      },
    );
    expect(assignResponse.status).toBe(201);

    const occupancyResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/occupancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({ unitId: unit1.id, residentUserId: residentA.id }),
      },
    );
    expect(occupancyResponse.status).toBe(201);
  });

  it('resident with active occupancy can access resident-safe read endpoint', async () => {
    await fetch(`${baseUrl}/org/buildings/${buildingA.id}/occupancies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': buildingAdminA.id,
      },
      body: JSON.stringify({ unitId: unit2.id, residentUserId: residentA.id }),
    });

    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units/basic`,
      {
        headers: { 'x-user-id': residentA.id },
      },
    );
    expect(response.status).toBe(200);
  });

  it('lists buildings assigned to the current user', async () => {
    const response = await fetch(`${baseUrl}/org/buildings/assigned`, {
      headers: { 'x-user-id': managerA.id },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(buildingA.id);
  });

  it('returns 404 before 403 for out-of-org buildings', async () => {
    const response = await fetch(`${baseUrl}/org/buildings/${buildingB.id}`, {
      headers: { 'x-user-id': plainA.id },
    });
    expect(response.status).toBe(404);
  });
});
