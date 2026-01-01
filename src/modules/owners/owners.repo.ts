import { Injectable } from '@nestjs/common';
import { Owner } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OwnersRepo {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, search?: string): Promise<Owner[]> {
    return this.prisma.owner.findMany({
      where: {
        orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    orgId: string,
    data: { name: string; email?: string; phone?: string; address?: string },
  ): Promise<Owner> {
    return this.prisma.owner.create({
      data: {
        orgId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });
  }
}
