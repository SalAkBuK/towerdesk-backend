import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OrgProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(orgId: string) {
    const org = await this.prisma.org.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Org not found');
    }
    return org;
  }

  async updateProfile(orgId: string, data: { name?: string; logoUrl?: string }) {
    const org = await this.prisma.org.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Org not found');
    }
    return this.prisma.org.update({
      where: { id: orgId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      },
    });
  }
}
