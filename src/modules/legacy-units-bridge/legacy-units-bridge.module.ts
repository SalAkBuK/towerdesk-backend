import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { OccupancyBridgeController } from './occupancy.controller';
import { OccupancyBridgeRepo } from './occupancy.repo';
import { OccupancyBridgeService } from './occupancy.service';
import { UnitsBridgeController } from './units.controller';
import { UnitsBridgeRepo } from './units.repo';
import { UnitsBridgeService } from './units.service';

@Module({
  imports: [PrismaModule],
  controllers: [UnitsBridgeController, OccupancyBridgeController],
  providers: [
    UnitsBridgeRepo,
    UnitsBridgeService,
    OccupancyBridgeRepo,
    OccupancyBridgeService,
  ],
})
export class LegacyUnitsBridgeModule {}
