import { PermissionEffect } from '@prisma/client';
import { AccessControlService } from './access-control.service';
import { AccessControlRepo } from './access-control.repo';

describe('AccessControlService', () => {
  let accessControlRepo: jest.Mocked<AccessControlRepo>;
  let accessControlService: AccessControlService;

  beforeEach(() => {
    accessControlRepo = {
      getUserAccess: jest.fn(),
    } as unknown as jest.Mocked<AccessControlRepo>;

    accessControlService = new AccessControlService(accessControlRepo);
  });

  it('computes effective permissions with allow and deny overrides', async () => {
    accessControlRepo.getUserAccess.mockResolvedValue({
      rolePermissionKeys: ['users.read', 'roles.read'],
      userOverrides: [
        { key: 'users.write', effect: PermissionEffect.ALLOW },
        { key: 'roles.read', effect: PermissionEffect.DENY },
      ],
    });

    const result = await accessControlService.getUserEffectivePermissions('user-1');

    expect(result.has('users.read')).toBe(true);
    expect(result.has('users.write')).toBe(true);
    expect(result.has('roles.read')).toBe(false);
  });
});
