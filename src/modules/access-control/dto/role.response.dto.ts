import { ApiProperty } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

type RoleWithPermissions = Role & {
  rolePermissions: { permission: Permission }[];
};

export const toRoleResponse = (role: RoleWithPermissions): RoleResponseDto => ({
  id: role.id,
  key: role.key,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
  permissions: role.rolePermissions.map(
    (rolePermission) => rolePermission.permission.key,
  ),
});
