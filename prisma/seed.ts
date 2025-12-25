import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

const permissions = [
  { key: 'users.read', name: 'Read users', description: 'View user records' },
  { key: 'users.write', name: 'Manage users', description: 'Create/update users' },
  { key: 'roles.read', name: 'Read roles', description: 'View roles and permissions' },
  { key: 'roles.write', name: 'Manage roles', description: 'Create/update roles' },
];

const roles = [
  { key: 'super_admin', name: 'Super Admin', description: 'Full access' },
  { key: 'admin', name: 'Admin', description: 'Manage users and roles' },
  { key: 'viewer', name: 'Viewer', description: 'Read-only access' },
];

const rolePermissionMap: Record<string, string[]> = {
  super_admin: permissions.map((permission) => permission.key),
  admin: ['users.read', 'users.write', 'roles.read'],
  viewer: ['users.read', 'roles.read'],
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

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedRolePermissions();
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
