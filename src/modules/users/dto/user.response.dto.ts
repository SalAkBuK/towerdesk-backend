import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  name?: string | null;

  @ApiProperty({ required: false })
  avatarUrl?: string | null;

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false })
  orgId?: string | null;

  @ApiProperty()
  mustChangePassword!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, type: [String] })
  roleKeys?: string[];
}

type UserRecord = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  orgId?: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const toUserResponse = (
  user: UserRecord,
  roleKeys?: string[],
): UserResponseDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl ?? null,
  phone: user.phone ?? null,
  isActive: user.isActive,
  orgId: user.orgId ?? null,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  roleKeys,
});
