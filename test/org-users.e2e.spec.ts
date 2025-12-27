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
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AccessControlService } from '../src/modules/access-control/access-control.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { UsersRepo } from '../src/modules/users/users.repo';
import { UsersService } from '../src/modules/users/users.service';
import { UsersController } from '../src/modules/users/users.controller';
import { OrgUsersController } from '../src/modules/users/org-users.controller';

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

type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserRoleRecord = {
  userId: string;
  roleId: string;
  createdAt: Date;
};

let prisma: InMemoryPrismaService;

class InMemoryPrismaService {
  private users: UserRecord[] = [];
  private roles: RoleRecord[] = [];
  private userRoles: UserRoleRecord[] = [];

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
    findMany: async ({ where }: { where: { orgId?: string | null } }) => {
      if (where.orgId === undefined) {
        return this.users;
      }
      return this.users.filter((user) => user.orgId === where.orgId);
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

  role = {
    findMany: async ({
      where,
    }: {
      where: { key: { in: string[] } };
    }) => {
      return this.roles.filter((role) => where.key.in.includes(role.key));
    },
  };

  userRole = {
    createMany: async ({
      data,
    }: {
      data: { userId: string; roleId: string }[];
    }) => {
      const now = new Date();
      for (const entry of data) {
        this.userRoles.push({ userId: entry.userId, roleId: entry.roleId, createdAt: now });
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

  seedRoles(roleKeys: string[]) {
    const now = new Date();
    this.roles = roleKeys.map((key) => ({
      id: randomUUID(),
      key,
      name: key.replace('_', ' '),
      description: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

  getUserRoles() {
    return this.userRoles;
  }

  getUsers() {
    return this.users;
  }

  reset() {
    this.users = [];
    this.roles = [];
    this.userRoles = [];
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

describe('Org users (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let orgAdmin: UserRecord;
  let noOrgUser: UserRecord;

  const permissionsByUser = new Map<string, Set<string>>();

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController, OrgUsersController],
      providers: [
        UsersRepo,
        UsersService,
        OrgScopeGuard,
        PermissionsGuard,
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

    prisma.seedRoles(['org_admin', 'admin', 'viewer', 'resident', 'super_admin']);

    orgAdmin = await prisma.user.create({
      data: {
        email: 'admin@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Org Admin',
        isActive: true,
      },
    });

    noOrgUser = await prisma.user.create({
      data: {
        email: 'no-org@org.test',
        passwordHash: 'hash',
        orgId: null,
        name: 'No Org',
        isActive: true,
      },
    });

    permissionsByUser.set(orgAdmin.id, new Set(['users.write', 'users.read']));
    permissionsByUser.set(noOrgUser.id, new Set(['users.write', 'users.read']));
  });

  it('creates a user in the same org and assigns roles', async () => {
    const response = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        name: 'Manager User',
        email: 'manager@org.test',
        roleKeys: ['admin'],
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.email).toBe('manager@org.test');
    expect(body.mustChangePassword).toBe(true);
    expect(body.tempPassword).toBeTruthy();

    const createdUser = prisma
      .getUsers()
      .find((user) => user.email === 'manager@org.test');
    expect(createdUser?.orgId).toBe('org-a');
    expect(createdUser?.mustChangePassword).toBe(true);

    const userRoles = prisma.getUserRoles();
    expect(
      userRoles.some(
        (entry) => entry.userId === createdUser?.id,
      ),
    ).toBe(true);
  });

  it('lists users in the same org', async () => {
    await prisma.user.create({
      data: {
        email: 'member@org.test',
        passwordHash: 'hash',
        orgId: 'org-a',
        name: 'Org Member',
        isActive: true,
      },
    });
    await prisma.user.create({
      data: {
        email: 'other@org.test',
        passwordHash: 'hash',
        orgId: 'org-b',
        name: 'Other Org',
        isActive: true,
      },
    });

    const response = await fetch(`${baseUrl}/org/users`, {
      headers: {
        'x-user-id': orgAdmin.id,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'admin@org.test', orgId: 'org-a' }),
        expect.objectContaining({ email: 'member@org.test', orgId: 'org-a' }),
      ]),
    );
    expect(body.some((user: { email: string }) => user.email === 'other@org.test')).toBe(false);
  });

  it('rejects super_admin role assignment', async () => {
    const response = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgAdmin.id,
      },
      body: JSON.stringify({
        name: 'Bad Role',
        email: 'bad@org.test',
        roleKeys: ['super_admin'],
      }),
    });

    expect(response.status).toBe(400);
  });

  it('rejects requests without org scope', async () => {
    const response = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': noOrgUser.id,
      },
      body: JSON.stringify({
        name: 'No Org',
        email: 'no-org-user@org.test',
      }),
    });

    expect(response.status).toBe(403);
  });
});
