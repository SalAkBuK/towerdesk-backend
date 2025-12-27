import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class AuthRepo {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateRefreshTokenHash(id: string, refreshTokenHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });
  }

  async getRoleKeys(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.map((entry) => entry.role.key);
  }
}
