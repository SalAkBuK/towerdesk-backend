import { Injectable } from '@nestjs/common';
import { PermissionEffect } from '@prisma/client';
import { AccessControlRepo } from './access-control.repo';

export interface PermissionContext {
  orgId?: string;
  buildingId?: string;
}

@Injectable()
export class AccessControlService {
  constructor(private readonly accessControlRepo: AccessControlRepo) {}

  async getUserEffectivePermissions(
    userId: string,
    _context?: PermissionContext,
  ): Promise<Set<string>> {
    const { rolePermissionKeys, userOverrides } =
      await this.accessControlRepo.getUserAccess(userId);

    const effective = new Set(rolePermissionKeys);

    for (const override of userOverrides) {
      if (override.effect === PermissionEffect.ALLOW) {
        effective.add(override.key);
      } else {
        effective.delete(override.key);
      }
    }

    return effective;
  }
}
