import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlRepo } from './access-control.repo';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto, toRoleResponse } from './dto/role.response.dto';
import { RolePermissionsUpdateMode } from './dto/set-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly accessControlRepo: AccessControlRepo) {}

  async list(): Promise<RoleResponseDto[]> {
    const roles = await this.accessControlRepo.listRolesWithPermissions();
    return roles.map(toRoleResponse);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.accessControlRepo.createRole({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
    });

    return toRoleResponse({
      ...role,
      rolePermissions: [],
    });
  }

  async setRolePermissions(
    roleId: string,
    permissionKeys: string[],
    mode: RolePermissionsUpdateMode = 'replace',
  ): Promise<RoleResponseDto> {
    const existingRole = await this.accessControlRepo.findRoleWithPermissionsById(
      roleId,
    );
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.accessControlRepo.findPermissionsByKeys(
      permissionKeys,
    );
    const permissionIds = permissions.map((permission) => permission.id);
    const missing = permissionKeys.filter(
      (key) => !permissions.find((permission) => permission.key === key),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown permission keys: ${missing.join(', ')}`,
      );
    }

    if (mode === 'add') {
      await this.accessControlRepo.addRolePermissions(roleId, permissionIds);
    } else {
      await this.accessControlRepo.replaceRolePermissions(roleId, permissionIds);
    }

    const role = await this.accessControlRepo.findRoleWithPermissionsById(roleId);
    return role ? toRoleResponse(role) : toRoleResponse(existingRole);
  }
}
