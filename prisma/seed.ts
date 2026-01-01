import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as argon2 from 'argon2';

config();

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run seed in production');
}

const permissions = [
  { key: 'users.read', name: 'Read users', description: 'View user records' },
  { key: 'users.write', name: 'Manage users', description: 'Create/update users' },
  { key: 'roles.read', name: 'Read roles', description: 'View roles and permissions' },
  { key: 'roles.write', name: 'Manage roles', description: 'Create/update roles' },
  {
    key: 'buildings.read',
    name: 'Read buildings',
    description: 'View buildings in the org',
  },
  {
    key: 'buildings.write',
    name: 'Manage buildings',
    description: 'Create/update buildings in the org',
  },
  { key: 'units.read', name: 'Read units', description: 'View units in a building' },
  {
    key: 'units.write',
    name: 'Manage units',
    description: 'Create/update units in a building',
  },
  {
    key: 'unitTypes.read',
    name: 'Read unit types',
    description: 'View unit types in the org',
  },
  {
    key: 'unitTypes.write',
    name: 'Manage unit types',
    description: 'Create/update unit types in the org',
  },
  {
    key: 'owners.read',
    name: 'Read owners',
    description: 'View owners in the org',
  },
  {
    key: 'owners.write',
    name: 'Manage owners',
    description: 'Create/update owners in the org',
  },
  {
    key: 'building.assignments.read',
    name: 'Read building assignments',
    description: 'View building assignments',
  },
  {
    key: 'building.assignments.write',
    name: 'Manage building assignments',
    description: 'Create building assignments',
  },
  {
    key: 'occupancy.read',
    name: 'Read occupancies',
    description: 'View active occupancies',
  },
  {
    key: 'occupancy.write',
    name: 'Manage occupancies',
    description: 'Create occupancies',
  },
  {
    key: 'residents.read',
    name: 'Read residents',
    description: 'View building residents',
  },
  {
    key: 'residents.write',
    name: 'Manage residents',
    description: 'Onboard residents and assign units',
  },
  {
    key: 'requests.read',
    name: 'Read maintenance requests',
    description: 'View maintenance requests',
  },
  {
    key: 'requests.write',
    name: 'Manage maintenance requests',
    description: 'Edit maintenance requests',
  },
  {
    key: 'requests.assign',
    name: 'Assign maintenance requests',
    description: 'Assign requests to staff',
  },
  {
    key: 'requests.update_status',
    name: 'Update maintenance status',
    description: 'Move requests through workflow',
  },
  {
    key: 'requests.comment',
    name: 'Comment on maintenance requests',
    description: 'Post comments on requests',
  },
  {
    key: 'org.profile.write',
    name: 'Manage org profile',
    description: 'Update org name and branding',
  },
  {
    key: 'platform.org.create',
    name: 'Create orgs',
    description: 'Create organizations via platform',
  },
  {
    key: 'platform.org.read',
    name: 'Read orgs',
    description: 'List organizations via platform',
  },
  {
    key: 'platform.org.admin.create',
    name: 'Create org admins',
    description: 'Create org admins via platform',
  },
  {
    key: 'platform.org.admin.read',
    name: 'Read org admins',
    description: 'List org admins via platform',
  },
];

const roles = [
  { key: 'super_admin', name: 'Super Admin', description: 'Full access' },
  { key: 'org_admin', name: 'Org Admin', description: 'Org administrator' },
  { key: 'admin', name: 'Admin', description: 'Manage users and roles' },
  { key: 'viewer', name: 'Viewer', description: 'Read-only access' },
  { key: 'resident', name: 'Resident', description: 'Resident user' },
  {
    key: 'platform_superadmin',
    name: 'Platform Superadmin',
    description: 'Platform administrator',
  },
];

const rolePermissionMap: Record<string, string[]> = {
  super_admin: permissions.map((permission) => permission.key),
  org_admin: [
    'users.read',
    'users.write',
    'roles.read',
    'buildings.read',
    'buildings.write',
    'units.read',
    'units.write',
    'unitTypes.read',
    'unitTypes.write',
    'building.assignments.read',
    'building.assignments.write',
    'occupancy.read',
    'occupancy.write',
    'residents.read',
    'residents.write',
    'owners.read',
    'owners.write',
    'requests.read',
    'requests.write',
    'requests.assign',
    'requests.update_status',
    'requests.comment',
    'org.profile.write',
  ],
  admin: ['users.read', 'users.write', 'roles.read'],
  viewer: ['users.read', 'roles.read'],
  resident: [],
  platform_superadmin: [
    'platform.org.create',
    'platform.org.read',
    'platform.org.admin.create',
    'platform.org.admin.read',
  ],
};

async function seedPermissions() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
      },
      create: permission,
    });
  }
}

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystem: true,
      },
      create: {
        ...role,
        isSystem: true,
      },
    });
  }
}

async function seedRolePermissions() {
  const permissionRecords = await prisma.permission.findMany({
    where: { key: { in: permissions.map((permission) => permission.key) } },
  });
  const roleRecords = await prisma.role.findMany({
    where: { key: { in: roles.map((role) => role.key) } },
  });

  const permissionByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission.id]),
  );
  const roleByKey = new Map(roleRecords.map((role) => [role.key, role.id]));

  const data = Object.entries(rolePermissionMap).flatMap(([roleKey, keys]) => {
    const roleId = roleByKey.get(roleKey);
    if (!roleId) {
      return [];
    }
    return keys
      .map((key) => permissionByKey.get(key))
      .filter((permissionId): permissionId is string => Boolean(permissionId))
      .map((permissionId) => ({
        roleId,
        permissionId,
      }));
  });

  if (data.length > 0) {
    await prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

async function seedOrg() {
  const existing = await prisma.org.findFirst({
    where: { name: 'Towerdesk Demo Org' },
  });
  if (existing) {
    return existing;
  }

  return prisma.org.create({ data: { name: 'Towerdesk Demo Org' } });
}

async function seedUnitTypes(orgId: string) {
  const defaults = ['Apartment', 'Shop', 'Office', 'Other'];
  for (const name of defaults) {
    await prisma.unitType.upsert({
      where: { orgId_name: { orgId, name } },
      update: { isActive: true },
      create: { orgId, name, isActive: true },
    });
  }
}

async function seedOrgAdmin(orgId: string) {
  const passwordHash = await argon2.hash('Admin123!');
  const user = await prisma.user.upsert({
    where: { email: 'admin@towerdesk.local' },
    update: {
      name: 'Org Admin',
      orgId,
      isActive: true,
    },
    create: {
      email: 'admin@towerdesk.local',
      name: 'Org Admin',
      passwordHash,
      orgId,
    },
  });

  const adminRole = await prisma.role.findUnique({ where: { key: 'org_admin' } });
  if (adminRole) {
    await prisma.userRole.createMany({
      data: [{ userId: user.id, roleId: adminRole.id }],
      skipDuplicates: true,
    });
  }

  return user;
}

async function seedPlatformSuperadmin() {
  const email =
    process.env.PLATFORM_SUPERADMIN_EMAIL ?? 'platform-admin@towerdesk.local';
  const password = process.env.PLATFORM_SUPERADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Platform Superadmin',
      orgId: null,
      isActive: true,
    },
    create: {
      email,
      name: 'Platform Superadmin',
      passwordHash,
      orgId: null,
      mustChangePassword: true,
    },
  });

  const role = await prisma.role.findUnique({
    where: { key: 'platform_superadmin' },
  });
  if (role) {
    await prisma.userRole.createMany({
      data: [{ userId: user.id, roleId: role.id }],
      skipDuplicates: true,
    });
  }

  return user;
}

async function seedBuilding(orgId: string) {
  const existing = await prisma.building.findFirst({
    where: {
      orgId,
      name: 'Towerdesk HQ',
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.building.create({
    data: {
      orgId,
      name: 'Towerdesk HQ',
      city: 'Dubai',
      emirate: 'Dubai',
      country: 'ARE',
      timezone: 'Asia/Dubai',
    },
  });
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedRolePermissions();

  const org = await seedOrg();
  await seedUnitTypes(org.id);
  await seedOrgAdmin(org.id);
  await seedPlatformSuperadmin();
  await seedBuilding(org.id);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
