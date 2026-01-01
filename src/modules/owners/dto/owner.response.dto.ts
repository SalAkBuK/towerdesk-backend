import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Owner } from '@prisma/client';

export class OwnerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orgId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const toOwnerResponse = (owner: Owner): OwnerResponseDto => ({
  id: owner.id,
  orgId: owner.orgId,
  name: owner.name,
  email: owner.email ?? null,
  phone: owner.phone ?? null,
  address: owner.address ?? null,
  createdAt: owner.createdAt,
  updatedAt: owner.updatedAt,
});
