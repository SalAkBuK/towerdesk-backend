import { Injectable } from '@nestjs/common';
import { PermissionEffect, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface UserPermissionOverride {
  key: string;
  effect: PermissionEffect;
}

@Injectable()
export class AccessControlRepo {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  listRolesWithPermissions() {
    return this.prisma.role.findMany({
      orderBy: { key: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  findRoleWithPermissionsById(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  createRole(data: Prisma.RoleCreateInput) {
    return this.prisma.role.create({ data });
  }

  findPermissionsByKeys(keys: string[]) {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.permission.findMany({
      where: { key: { in: keys } },
    });
  }

  findRolesByIds(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.role.findMany({
      where: { id: { in: ids } },
    });
  }

  async replaceRolePermissions(roleId: string, permissionIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...(permissionIds.length === 0
        ? []
        : [
            this.prisma.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
              })),
              skipDuplicates: true,
            }),
          ]),
    ]);
  }

  addRolePermissions(roleId: string, permissionIds: string[]) {
    if (permissionIds.length === 0) {
      return Promise.resolve();
    }
    return this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  async replaceUserRoles(userId: string, roleIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...(roleIds.length === 0
        ? []
        : [
            this.prisma.userRole.createMany({
              data: roleIds.map((roleId) => ({
                userId,
                roleId,
              })),
              skipDuplicates: true,
            }),
          ]),
    ]);
  }

  addUserRoles(userId: string, roleIds: string[]) {
    if (roleIds.length === 0) {
      return Promise.resolve();
    }
    return this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
      })),
      skipDuplicates: true,
    });
  }

  async replaceUserPermissions(
    userId: string,
    overrides: { permissionId: string; effect: PermissionEffect }[],
  ) {
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId } }),
      ...(overrides.length === 0
        ? []
        : [
            this.prisma.userPermission.createMany({
              data: overrides.map((override) => ({
                userId,
                permissionId: override.permissionId,
                effect: override.effect,
              })),
              skipDuplicates: true,
            }),
          ]),
    ]);
  }

  async getUserAccess(userId: string) {
    const [roles, overrides] = await this.prisma.$transaction([
      this.prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        include: {
          permission: true,
        },
      }),
    ]);

    const rolePermissionKeys = roles.flatMap((userRole) =>
      userRole.role.rolePermissions.map(
        (rolePermission) => rolePermission.permission.key,
      ),
    );

    const userOverrides: UserPermissionOverride[] = overrides.map((override) => ({
      key: override.permission.key,
      effect: override.effect,
    }));

    return {
      rolePermissionKeys,
      userOverrides,
    };
  }
}
