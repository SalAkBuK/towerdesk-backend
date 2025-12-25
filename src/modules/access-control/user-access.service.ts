import { BadRequestException, Injectable } from '@nestjs/common';
import { PermissionEffect } from '@prisma/client';
import { AccessControlRepo } from './access-control.repo';
import { UserRolesUpdateMode } from './dto/assign-user-roles.dto';

@Injectable()
export class UserAccessService {
  constructor(private readonly accessControlRepo: AccessControlRepo) {}

  async assignRoles(
    userId: string,
    roleIds: string[],
    mode: UserRolesUpdateMode = 'replace',
  ) {
    const roles = await this.accessControlRepo.findRolesByIds(roleIds);
    const missing = roleIds.filter(
      (roleId) => !roles.find((role) => role.id === roleId),
    );
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown role ids: ${missing.join(', ')}`);
    }

    if (mode === 'add') {
      await this.accessControlRepo.addUserRoles(userId, roleIds);
    } else {
      await this.accessControlRepo.replaceUserRoles(userId, roleIds);
    }
  }

  async setPermissionOverrides(
    userId: string,
    overrides: { permissionKey: string; effect: PermissionEffect }[],
  ) {
    const permissionKeys = overrides.map((override) => override.permissionKey);
    const permissions = await this.accessControlRepo.findPermissionsByKeys(
      permissionKeys,
    );
    const missing = permissionKeys.filter(
      (key) => !permissions.find((permission) => permission.key === key),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown permission keys: ${missing.join(', ')}`,
      );
    }

    const permissionIdByKey = new Map(
      permissions.map((permission) => [permission.key, permission.id]),
    );
    const mappedOverrides = overrides
      .map((override) => ({
        permissionId: permissionIdByKey.get(override.permissionKey),
        effect: override.effect,
      }))
      .filter(
        (override): override is { permissionId: string; effect: PermissionEffect } =>
          Boolean(override.permissionId),
      );

    await this.accessControlRepo.replaceUserPermissions(userId, mappedOverrides);
  }
}
