import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { BuildingAccessModule } from '../../common/building-access/building-access.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UnitsModule } from '../units/units.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MaintenanceRequestsRepo } from './maintenance-requests.repo';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { ResidentRequestsController } from './resident-requests.controller';
import { BuildingRequestsController } from './building-requests.controller';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    BuildingAccessModule,
    BuildingsModule,
    UnitsModule,
    NotificationsModule,
  ],
  controllers: [ResidentRequestsController, BuildingRequestsController],
  providers: [MaintenanceRequestsRepo, MaintenanceRequestsService],
})
export class MaintenanceRequestsModule {}
