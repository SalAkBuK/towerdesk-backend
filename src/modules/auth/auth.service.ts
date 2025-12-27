import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { env } from '../../config/env';
import { AuthRepo } from './auth.repo';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse } from '../users/dto/user.response.dto';

interface JwtPayload {
  sub: string;
  email: string;
  orgId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.authRepo.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const roleKeys = await this.authRepo.getRoleKeys(user.id);

    return {
      ...tokens,
      user: toUserResponse(user, roleKeys),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepo.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const roleKeys = await this.authRepo.getRoleKeys(user.id);

    return {
      ...tokens,
      user: toUserResponse(user, roleKeys),
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.authRepo.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const validRefresh = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!validRefresh) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const roleKeys = await this.authRepo.getRoleKeys(user.id);

    return {
      ...tokens,
      user: toUserResponse(user, roleKeys),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.authRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await argon2.verify(user.passwordHash, currentPassword);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.authRepo.updatePasswordHash(user.id, passwordHash);

    return { success: true };
  }

  private async issueTokens(user: User) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId ?? null,
    };

    const refreshPayload = {
      sub: user.id,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_TTL,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.authRepo.updateRefreshTokenHash(userId, refreshTokenHash);
  }
}
