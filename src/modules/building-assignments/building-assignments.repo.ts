import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BuildingAssignment, BuildingAssignmentType } from '@prisma/client';

@Injectable()
export class BuildingAssignmentsRepo {
  constructor(private readonly prisma: PrismaService) {}

  create(buildingId: string, userId: string, type: BuildingAssignmentType) {
    return this.prisma.buildingAssignment.create({
      data: {
        buildingId,
        userId,
        type,
      },
      include: {
        user: true,
      },
    });
  }

  listByBuilding(buildingId: string) {
    return this.prisma.buildingAssignment.findMany({
      where: { buildingId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<BuildingAssignment | null> {
    return this.prisma.buildingAssignment.findUnique({ where: { id } });
  }
}
