import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authRepo.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (payload.orgId !== undefined && payload.orgId !== (user.orgId ?? null)) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      sub: user.id,
      email: user.email,
      orgId: user.orgId ?? null,
    };
  }
}
