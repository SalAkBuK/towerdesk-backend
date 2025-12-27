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
import { AccessControlService } from '../src/modules/access-control/access-control.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { OrgUsersProvisionController } from '../src/modules/users/org-users-provision.controller';
import { OrgUsersProvisionService } from '../src/modules/users/org-users-provision.service';

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
  private roles: RoleRecord[] = [];
  private users: UserRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private buildings: BuildingRecord[] = [];
  private units: UnitRecord[] = [];
  private assignments: BuildingAssignmentRecord[] = [];
  private occupancies: OccupancyRecord[] = [];

  role = {
    findMany: async ({ where }: { where: { key: { in: string[] } } }) => {
      return this.roles.filter((role) => where.key.in.includes(role.key));
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
    findFirst: async ({
      where,
    }: {
      where: { email: { equals: string; mode?: string } };
    }) => {
      const email = where.email.equals;
      if (where.email.mode === 'insensitive') {
        const lower = email.toLowerCase();
        return (
          this.users.find((user) => user.email.toLowerCase() === lower) ?? null
        );
      }
      return this.users.find((user) => user.email === email) ?? null;
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
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: { userId: string; roleId: string }[];
      skipDuplicates?: boolean;
    }) => {
      const now = new Date();
      let created = 0;
      for (const entry of data) {
        const exists = this.userRoles.some(
          (record) =>
            record.userId === entry.userId && record.roleId === entry.roleId,
        );
        if (exists && skipDuplicates) {
          continue;
        }
        this.userRoles.push({
          userId: entry.userId,
          roleId: entry.roleId,
          createdAt: now,
        });
        created += 1;
      }
      return { count: created };
    },
  };

  building = {
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
    findFirst: async ({
      where,
    }: {
      where: { id: string; buildingId: string };
    }) => {
      return (
        this.units.find(
          (unit) =>
            unit.id === where.id && unit.buildingId === where.buildingId,
        ) ?? null
      );
    },
  };

  buildingAssignment = {
    findFirst: async ({
      where,
    }: {
      where: { buildingId: string; userId: string; type: string };
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
    findMany: async ({
      where,
    }: {
      where: {
        buildingId?: string | { in: string[] };
        userId?: string;
        type?: string | { in: string[] };
      };
    }) => {
      return this.assignments.filter((assignment) => {
        if (where.userId && assignment.userId !== where.userId) {
          return false;
        }
        if (where.buildingId) {
          if (typeof where.buildingId === 'string') {
            if (assignment.buildingId !== where.buildingId) {
              return false;
            }
          } else if (!where.buildingId.in.includes(assignment.buildingId)) {
            return false;
          }
        }
        if (where.type) {
          if (typeof where.type === 'string') {
            if (assignment.type !== where.type) {
              return false;
            }
          } else if (!where.type.in.includes(assignment.type)) {
            return false;
          }
        }
        return true;
      });
    },
    create: async ({
      data,
    }: {
      data: { buildingId: string; userId: string; type: string };
    }) => {
      const exists = this.assignments.some(
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
        type: data.type as BuildingAssignmentRecord['type'],
        createdAt: now,
        updatedAt: now,
      };
      this.assignments.push(assignment);
      return assignment;
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: {
        buildingId_userId_type: {
          buildingId: string;
          userId: string;
          type: string;
        };
      };
      update: { type: string };
      create: { buildingId: string; userId: string; type: string };
    }) => {
      const existing = this.assignments.find(
        (assignment) =>
          assignment.buildingId === where.buildingId_userId_type.buildingId &&
          assignment.userId === where.buildingId_userId_type.userId &&
          assignment.type === where.buildingId_userId_type.type,
      );
      if (existing) {
        existing.type = update.type as BuildingAssignmentRecord['type'];
        existing.updatedAt = new Date();
        return existing;
      }
      return this.buildingAssignment.create({ data: create });
    },
  };

  occupancy = {
    findFirst: async ({
      where,
    }: {
      where: {
        unitId?: string;
        residentUserId?: string;
        status?: 'ACTIVE' | 'ENDED';
        buildingId?: string;
      };
    }) => {
      return (
        this.occupancies.find((occ) => {
          if (where.unitId && occ.unitId !== where.unitId) {
            return false;
          }
          if (where.residentUserId && occ.residentUserId !== where.residentUserId) {
            return false;
          }
          if (where.status && occ.status !== where.status) {
            return false;
          }
          if (where.buildingId && occ.buildingId !== where.buildingId) {
            return false;
          }
          return true;
        }) ?? null
      );
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
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        residentUserId?: string;
        buildingId?: string;
        status?: 'ACTIVE' | 'ENDED';
        unitId?: string | { not: string };
      };
      data: { status?: 'ACTIVE' | 'ENDED'; endAt?: Date | null };
    }) => {
      let count = 0;
      for (const occ of this.occupancies) {
        if (where.residentUserId && occ.residentUserId !== where.residentUserId) {
          continue;
        }
        if (where.buildingId && occ.buildingId !== where.buildingId) {
          continue;
        }
        if (where.status && occ.status !== where.status) {
          continue;
        }
        if (where.unitId) {
          if (typeof where.unitId === 'string') {
            if (occ.unitId !== where.unitId) {
              continue;
            }
          } else if (occ.unitId === where.unitId.not) {
            continue;
          }
        }
        Object.assign(occ, data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
  };

  async $transaction<T>(arg: ((tx: this) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(this);
  }

  async $executeRaw() {
    return 0;
  }

  seedRoles(roleKeys: string[]) {
    const now = new Date();
    this.roles = roleKeys.map((key) => ({
      id: randomUUID(),
      key,
      name: key.replace('_', ' '),
      description: null,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    }));
  }

  seedBuilding(data: {
    orgId: string;
    name: string;
    city?: string;
    emirate?: string;
    country?: string;
    timezone?: string;
    floors?: number;
    unitsCount?: number;
  }) {
    const now = new Date();
    const building: BuildingRecord = {
      id: randomUUID(),
      orgId: data.orgId,
      name: data.name,
      city: data.city ?? 'Dubai',
      emirate: data.emirate ?? null,
      country: data.country ?? 'ARE',
      timezone: data.timezone ?? 'Asia/Dubai',
      floors: data.floors ?? null,
      unitsCount: data.unitsCount ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.buildings.push(building);
    return building;
  }

  seedUnit(data: { buildingId: string; label: string }) {
    const now = new Date();
    const unit: UnitRecord = {
      id: randomUUID(),
      buildingId: data.buildingId,
      label: data.label,
      createdAt: now,
      updatedAt: now,
    };
    this.units.push(unit);
    return unit;
  }

  getUsers() {
    return this.users;
  }

  getUserRoles() {
    return this.userRoles;
  }

  getAssignments() {
    return this.assignments;
  }

  getOccupancies() {
    return this.occupancies;
  }

  reset() {
    this.roles = [];
    this.users = [];
    this.userRoles = [];
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

describe('Org users provision (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAdmin: UserRecord;
  let buildingId: string;
  let unitId: string;

  const permissionsByUser = new Map<string, Set<string>>();

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [OrgUsersProvisionController],
      providers: [
        OrgUsersProvisionService,
        OrgScopeGuard,
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
    prisma.seedRoles(['org_admin', 'admin', 'viewer']);

    orgAdmin = await prisma.user.create({
      data: {
        email: 'admin@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Org Admin',
        isActive: true,
      },
    });

    permissionsByUser.set(orgAdmin.id, new Set(['users.write']));

    const building = prisma.seedBuilding({ orgId: 'org-a', name: 'Alpha Tower' });
    buildingId = building.id;
    unitId = prisma.seedUnit({ buildingId, label: 'A-101' }).id;
  });

  it('creates a user with roles, assignments, and residency', async () => {
    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'jane@org.test',
          name: 'Jane Admin',
          password: 'Password123!',
        },
        grants: {
          orgRoleKeys: ['admin'],
          buildingAssignments: [{ buildingId, type: 'MANAGER' }],
          resident: { buildingId, unitId, mode: 'ADD' },
        },
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.email).toBe('jane@org.test');
    expect(body.created).toBe(true);
    expect(body.linkedExisting).toBe(false);
    expect(body.applied.orgRoleKeys).toEqual(['admin']);
    expect(body.applied.buildingAssignments).toHaveLength(1);
    expect(body.applied.resident.unitId).toBe(unitId);

    expect(prisma.getUsers()).toHaveLength(2);
    expect(prisma.getUserRoles()).toHaveLength(1);
    expect(prisma.getAssignments()).toHaveLength(1);
    expect(prisma.getOccupancies()).toHaveLength(1);
  });

  it('is idempotent on repeated requests', async () => {
    const payload = {
      identity: {
        email: 'repeat@org.test',
        name: 'Repeat User',
        password: 'Password123!',
      },
      grants: {
        orgRoleKeys: ['admin'],
        buildingAssignments: [{ buildingId, type: 'STAFF' }],
        resident: { buildingId, unitId, mode: 'ADD' },
      },
    };

    const first = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify(payload),
    });

    expect(second.status).toBe(201);
    const body = await second.json();
    expect(body.created).toBe(false);
    expect(body.linkedExisting).toBe(true);
    expect(prisma.getUserRoles()).toHaveLength(1);
    expect(prisma.getAssignments()).toHaveLength(1);
    expect(prisma.getOccupancies()).toHaveLength(1);
  });

  it('rejects unknown role keys', async () => {
    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'unknown@org.test',
          name: 'Unknown Role',
          password: 'Password123!',
        },
        grants: {
          orgRoleKeys: ['missing_role'],
        },
      }),
    });

    expect(response.status).toBe(400);
  });

  it('rejects unit and building mismatches for residency', async () => {
    const otherBuilding = prisma.seedBuilding({
      orgId: 'org-a',
      name: 'Beta Tower',
    });

    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'resident@org.test',
          name: 'Resident',
          password: 'Password123!',
        },
        grants: {
          resident: { buildingId: otherBuilding.id, unitId, mode: 'ADD' },
        },
      }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 409 when email exists and mode is ERROR', async () => {
    await prisma.user.create({
      data: {
        email: 'exists@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Existing',
        isActive: true,
      },
    });

    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'exists@org.test',
          name: 'Existing',
          password: 'Password123!',
        },
        mode: { ifEmailExists: 'ERROR' },
      }),
    });

    expect(response.status).toBe(409);
  });

  it('allows managers to provision staff and residents in assigned buildings', async () => {
    const manager = await prisma.user.create({
      data: {
        email: 'manager@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Manager User',
        isActive: true,
      },
    });

    await prisma.buildingAssignment.create({
      data: { buildingId, userId: manager.id, type: 'MANAGER' },
    });

    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': manager.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'staff@org.test',
          name: 'Staff User',
          password: 'Password123!',
        },
        grants: {
          buildingAssignments: [{ buildingId, type: 'STAFF' }],
          resident: { buildingId, unitId, mode: 'ADD' },
        },
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.applied.buildingAssignments[0].type).toBe('STAFF');
    expect(body.applied.resident.unitId).toBe(unitId);
  });

  it('rejects managers assigning org roles', async () => {
    const manager = await prisma.user.create({
      data: {
        email: 'manager-roles@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Manager Roles',
        isActive: true,
      },
    });

    await prisma.buildingAssignment.create({
      data: { buildingId, userId: manager.id, type: 'MANAGER' },
    });

    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': manager.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'role-block@org.test',
          name: 'Role Block',
          password: 'Password123!',
        },
        grants: {
          orgRoleKeys: ['admin'],
          buildingAssignments: [{ buildingId, type: 'STAFF' }],
        },
      }),
    });

    expect(response.status).toBe(403);
  });

  it('rejects managers provisioning outside assigned buildings', async () => {
    const manager = await prisma.user.create({
      data: {
        email: 'manager-other@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Manager Other',
        isActive: true,
      },
    });

    await prisma.buildingAssignment.create({
      data: { buildingId, userId: manager.id, type: 'MANAGER' },
    });

    const otherBuilding = prisma.seedBuilding({
      orgId: 'org-a',
      name: 'Gamma Tower',
    });

    const response = await fetch(`${baseUrl}/org/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': manager.id,
      },
      body: JSON.stringify({
        identity: {
          email: 'other-staff@org.test',
          name: 'Other Staff',
          password: 'Password123!',
        },
        grants: {
          buildingAssignments: [{ buildingId: otherBuilding.id, type: 'STAFF' }],
        },
      }),
    });

    expect(response.status).toBe(403);
  });
});
