import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AccessControlService } from '../../modules/access-control/access-control.service';

describe('PermissionsGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let accessControlService: jest.Mocked<AccessControlService>;
  let guard: PermissionsGuard;

  const createContext = (request: Record<string, unknown>) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    accessControlService = {
      getUserEffectivePermissions: jest.fn(),
    } as unknown as jest.Mocked<AccessControlService>;

    guard = new PermissionsGuard(reflector, accessControlService);
  });

  it('allows when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(createContext({}));

    expect(result).toBe(true);
  });

  it('allows when permissions are satisfied', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users.read']);
    accessControlService.getUserEffectivePermissions.mockResolvedValue(
      new Set(['users.read', 'roles.read']),
    );

    const request = { user: { sub: 'user-1' } };
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
  });

  it('throws when permissions are missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.write']);
    accessControlService.getUserEffectivePermissions.mockResolvedValue(
      new Set(['roles.read']),
    );

    const request = { user: { sub: 'user-1' } };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when user is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.read']);

    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
