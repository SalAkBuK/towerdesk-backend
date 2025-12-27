import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { env } from '../../../config/env';
import { AuthRepo } from '../auth.repo';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authRepo: AuthRepo) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_ACCESS_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    const user = await this.authRepo.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (payload.orgId !== undefined && payload.orgId !== (user.orgId ?? null)) {
      throw new UnauthorizedException('Unauthorized');
    }

    const orgIdOverride = this.getOrgIdOverride(request);
    if (orgIdOverride && !user.orgId) {
      const roleKeys = await this.authRepo.getRoleKeys(user.id);
      if (roleKeys.includes('platform_superadmin')) {
        return {
          sub: user.id,
          email: user.email,
          orgId: orgIdOverride,
        };
      }
    }

    return {
      sub: user.id,
      email: user.email,
      orgId: user.orgId ?? null,
    };
  }

  private getOrgIdOverride(request: Request): string | null {
    const headerValue = request.headers['x-org-id'];
    const orgId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!orgId) {
      return null;
    }
    if (typeof orgId !== 'string') {
      throw new BadRequestException('Invalid org scope header');
    }
    const trimmed = orgId.trim();
    if (!trimmed) {
      return null;
    }
    const uuidV4ish =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidV4ish.test(trimmed)) {
      throw new BadRequestException('Invalid org scope header');
    }
    return trimmed;
  }
}
