import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UsersModule } from '../users/users.module';
import { BuildingAccessModule } from '../../common/building-access/building-access.module';
import { BuildingAssignmentsController } from './building-assignments.controller';
import { BuildingAssignmentsRepo } from './building-assignments.repo';
import { BuildingAssignmentsService } from './building-assignments.service';

@Module({
  imports: [PrismaModule, BuildingsModule, UsersModule, BuildingAccessModule],
  controllers: [BuildingAssignmentsController],
  providers: [BuildingAssignmentsRepo, BuildingAssignmentsService],
})
export class BuildingAssignmentsModule {}
