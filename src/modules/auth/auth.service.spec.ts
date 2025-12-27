import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { AuthRepo } from './auth.repo';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let authRepo: jest.Mocked<AuthRepo>;
  let jwtService: jest.Mocked<JwtService>;
  let authService: AuthService;

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash',
    refreshTokenHash: null,
    name: null,
    orgId: null,
    mustChangePassword: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(() => {
    authRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
    } as unknown as jest.Mocked<AuthRepo>;

    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(authRepo, jwtService);
  });

  it('registers a user and returns tokens', async () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    authRepo.findByEmail.mockResolvedValue(null);
    authRepo.createUser.mockResolvedValue({
      ...baseUser,
      email: dto.email,
      name: dto.name ?? null,
    });
    authRepo.updateRefreshTokenHash.mockResolvedValue(baseUser);

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await authService.register(dto);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe(dto.email);

    const createArgs = authRepo.createUser.mock.calls[0][0];
    expect(createArgs.email).toBe(dto.email);
    expect(createArgs.passwordHash).not.toBe(dto.password);
    expect(typeof createArgs.passwordHash).toBe('string');
  });

  it('logs in a user and returns tokens', async () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };
    const passwordHash = await argon2.hash(dto.password);

    authRepo.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash,
    });
    authRepo.updateRefreshTokenHash.mockResolvedValue(baseUser);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await authService.login(dto);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe(dto.email);
  });

  it('refreshes tokens with a valid refresh token', async () => {
    const refreshToken = 'refresh-token';
    const refreshTokenHash = await argon2.hash(refreshToken);

    authRepo.findById.mockResolvedValue({
      ...baseUser,
      refreshTokenHash,
    });
    authRepo.updateRefreshTokenHash.mockResolvedValue(baseUser);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await authService.refresh(baseUser.id, refreshToken);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });
});
