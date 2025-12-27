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
import { BuildingsRepo } from '../src/modules/buildings/buildings.repo';
import { UnitsRepo } from '../src/modules/units/units.repo';
import { UnitsController } from '../src/modules/units/units.controller';
import { UnitsService } from '../src/modules/units/units.service';
import { ResidentsController } from '../src/modules/residents/residents.controller';
import { ResidentsService } from '../src/modules/residents/residents.service';

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

type UserRoleRecord = {
  userId: string;
  roleId: string;
  createdAt: Date;
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
  private roles: RoleRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private users: UserRecord[] = [];
  private buildings: BuildingRecord[] = [];
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

  role = {
    findUnique: async ({ where }: { where: { key: string } }) => {
      return this.roles.find((role) => role.key === where.key) ?? null;
    },
    create: async ({ data }: { data: { key: string; name: string } }) => {
      const now = new Date();
      const role: RoleRecord = {
        id: randomUUID(),
        key: data.key,
        name: data.name,
        description: null,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      };
      this.roles.push(role);
      return role;
    },
  };

  userRole = {
    create: async ({ data }: { data: { userId: string; roleId: string } }) => {
      const record: UserRoleRecord = {
        userId: data.userId,
        roleId: data.roleId,
        createdAt: new Date(),
      };
      this.userRoles.push(record);
      return record;
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
    }: {
      where: {
        unitId?: string;
        buildingId?: string;
        residentUserId?: string;
        status: 'ACTIVE';
      };
    }) => {
      return (
        this.occupancies.find(
          (occ) =>
            (where.unitId ? occ.unitId === where.unitId : true) &&
            (where.buildingId ? occ.buildingId === where.buildingId : true) &&
            (where.residentUserId
              ? occ.residentUserId === where.residentUserId
              : true) &&
            occ.status === where.status,
        ) ?? null
      );
    },
    findMany: async ({
      where,
      include,
    }: {
      where: { buildingId: string; status?: 'ACTIVE' | 'ENDED' };
      include?: { unit?: boolean; residentUser?: boolean };
    }) => {
      const occupancies = this.occupancies.filter(
        (occ) =>
          occ.buildingId === where.buildingId &&
          (where.status ? occ.status === where.status : true),
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

  async $transaction<T>(arg: ((tx: this) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(this);
  }

  reset() {
    this.orgs = [];
    this.roles = [];
    this.userRoles = [];
    this.users = [];
    this.buildings = [];
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

describe('Building residents onboarding (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAdminA: UserRecord;
  let orgAdminB: UserRecord;
  let managerA: UserRecord;
  let buildingAdminA: UserRecord;
  let staffA: UserRecord;
  let buildingA: BuildingRecord;
  let buildingB: BuildingRecord;
  let unitA1: UnitRecord;
  let unitA2: UnitRecord;
  let unitB1: UnitRecord;

  const permissionsByUser = new Map<string, Set<string>>();

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [ResidentsController, UnitsController],
      providers: [
        ResidentsService,
        UnitsService,
        UnitsRepo,
        BuildingsRepo,
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

    await prisma.role.create({ data: { key: 'resident', name: 'Resident' } });

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
    unitB1 = await prisma.unit.create({
      data: { buildingId: buildingB.id, label: 'B-101' },
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

    permissionsByUser.set(
      orgAdminA.id,
      new Set(['residents.read', 'residents.write', 'units.read']),
    );
    permissionsByUser.set(
      orgAdminB.id,
      new Set(['residents.read', 'residents.write', 'units.read']),
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
  });

  it('org admin can onboard resident and see updated availability', async () => {
    const createResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAdminA.id,
        },
        body: JSON.stringify({
          name: 'Resident One',
          email: 'resident1@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.userId).toBeTruthy();
    expect(createBody.mustChangePassword).toBe(true);
    expect(typeof createBody.tempPassword).toBe('string');

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        headers: { 'x-user-id': orgAdminA.id },
      },
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody).toHaveLength(1);
    expect(listBody[0].unit.label).toBe('A-101');
    expect(listBody[0].status).toBe('ACTIVE');

    const availableResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/units?available=true`,
      { headers: { 'x-user-id': orgAdminA.id } },
    );

    expect(availableResponse.status).toBe(200);
    const availableBody = await availableResponse.json();
    expect(availableBody).toHaveLength(1);
    expect(availableBody[0].id).toBe(unitA2.id);
  });

  it('rejects unit mismatch', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAdminA.id,
        },
        body: JSON.stringify({
          name: 'Resident One',
          email: 'resident2@org.test',
          unitId: unitB1.id,
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('rejects occupied unit', async () => {
    await fetch(`${baseUrl}/org/buildings/${buildingA.id}/residents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdminA.id,
      },
      body: JSON.stringify({
        name: 'Resident One',
        email: 'resident3@org.test',
        unitId: unitA1.id,
      }),
    });

    const duplicate = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAdminA.id,
        },
        body: JSON.stringify({
          name: 'Resident Two',
          email: 'resident4@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(duplicate.status).toBe(409);
  });

  it('manager can write by assignment alone', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({
          name: 'Resident Five',
          email: 'resident5@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(response.status).toBe(201);
  });

  it('manager can still write with explicit permission', async () => {
    permissionsByUser.set(managerA.id, new Set(['residents.write']));

    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': managerA.id,
        },
        body: JSON.stringify({
          name: 'Resident Six',
          email: 'resident6@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(response.status).toBe(201);
  });

  it('building admin can write without permission', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': buildingAdminA.id,
        },
        body: JSON.stringify({
          name: 'Resident Seven',
          email: 'resident7@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(response.status).toBe(201);
  });

  it('staff cannot write residents', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': staffA.id,
        },
        body: JSON.stringify({
          name: 'Resident Eight',
          email: 'resident8@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 for cross-org resident access', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAdminB.id,
        },
        body: JSON.stringify({
          name: 'Resident Nine',
          email: 'resident9@org.test',
          unitId: unitA1.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingA.id}/residents`,
      { headers: { 'x-user-id': orgAdminB.id } },
    );
    expect(listResponse.status).toBe(404);
  });
});
