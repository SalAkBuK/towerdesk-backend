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

let prisma: InMemoryPrismaService;

class InMemoryPrismaService {
  private orgs: OrgRecord[] = [];
  private roles: RoleRecord[] = [];
  private users: UserRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private buildings: BuildingRecord[] = [];
  private units: UnitRecord[] = [];

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
    findMany: async ({ where }: { where: { buildingId: string } }) => {
      return this.units.filter((unit) => unit.buildingId === where.buildingId);
    },
  };

  reset() {
    this.orgs = [];
    this.roles = [];
    this.users = [];
    this.userRoles = [];
    this.buildings = [];
    this.units = [];
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

describe('Org Units (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAAdminId: string;
  let orgBAdminId: string;
  let buildingId: string;

  const platformKey = process.env.PLATFORM_API_KEY ?? 'test-platform-key';

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [PlatformOrgsController, BuildingsController, UnitsController],
      providers: [
        PlatformOrgsService,
        BuildingsService,
        BuildingsRepo,
        UnitsService,
        UnitsRepo,
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
  });

  it('org admin can create and list units', async () => {
    const createResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({ label: 'A-101', floor: 1 }),
      },
    );

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.label).toBe('A-101');

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        headers: { 'x-user-id': orgAAdminId },
      },
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody).toHaveLength(1);
  });

  it('org b admin cannot access org a building or units', async () => {
    const detailResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}`,
      {
        headers: { 'x-user-id': orgBAdminId },
      },
    );
    expect(detailResponse.status).toBe(404);

    const createResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgBAdminId,
        },
        body: JSON.stringify({ label: 'B-201' }),
      },
    );
    expect(createResponse.status).toBe(404);

    const listResponse = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        headers: { 'x-user-id': orgBAdminId },
      },
    );
    expect(listResponse.status).toBe(404);
  });

  it('returns 409 for duplicate unit labels in same building', async () => {
    await fetch(`${baseUrl}/org/buildings/${buildingId}/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAAdminId,
      },
      body: JSON.stringify({ label: 'A-101' }),
    });

    const duplicateResponse = await fetch(
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

    expect(duplicateResponse.status).toBe(409);
  });

  it('returns 400 for invalid payloads', async () => {
    const response = await fetch(
      `${baseUrl}/org/buildings/${buildingId}/units`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': orgAAdminId,
        },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });
});
