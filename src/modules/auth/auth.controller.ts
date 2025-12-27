import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { env } from '../../config/env';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordResponseDto } from './dto/change-password.response.dto';

const authThrottle = {
  default: {
    limit: env.THROTTLE_AUTH_LIMIT ?? 10,
    ttl: (env.THROTTLE_AUTH_TTL ?? 60) * 1000,
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(authThrottle)
  @ApiOkResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(authThrottle)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(authThrottle)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@CurrentUser('sub') userId: string, @Body() dto: RefreshDto) {
    return this.authService.refresh(userId, dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ChangePasswordResponseDto })
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
