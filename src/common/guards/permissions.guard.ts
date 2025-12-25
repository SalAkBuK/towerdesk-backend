import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../../modules/access-control/access-control.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestContext } from '../types/request-context';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permissions || permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestContext>();
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!request.effectivePermissions) {
      request.effectivePermissions =
        await this.accessControlService.getUserEffectivePermissions(userId);
    }

    const hasAll = permissions.every((permission) =>
      request.effectivePermissions?.has(permission),
    );
    if (!hasAll) {
      throw new ForbiddenException('Missing required permissions');
    }

    return true;
  }
}
