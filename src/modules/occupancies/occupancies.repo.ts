import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OccupanciesRepo {
  constructor(private readonly prisma: PrismaService) {}

  createActiveIfVacant(
    buildingId: string,
    unitId: string,
    residentUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.occupancy.findFirst({
        where: {
          unitId,
          status: 'ACTIVE',
        },
      });
      if (existing) {
        return null;
      }

      return tx.occupancy.create({
        data: {
          buildingId,
          unitId,
          residentUserId,
          status: 'ACTIVE',
        },
        include: {
          unit: true,
          residentUser: true,
        },
      });
    });
  }

  listActiveByBuilding(buildingId: string) {
    return this.prisma.occupancy.findMany({
      where: {
        buildingId,
        status: 'ACTIVE',
      },
      include: {
        unit: true,
        residentUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countActiveByBuilding(buildingId: string) {
    return this.prisma.occupancy.count({
      where: {
        buildingId,
        status: 'ACTIVE',
      },
    });
  }
}
