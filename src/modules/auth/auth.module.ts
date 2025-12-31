import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepo } from './auth.repo';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthValidationService } from './auth-validation.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepo,
    JwtStrategy,
    RefreshTokenGuard,
    AuthValidationService,
  ],
  exports: [AuthService, AuthValidationService],
})
export class AuthModule {}
