import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { BuildingAccessModule } from '../../common/building-access/building-access.module';
import { UnitsController } from './units.controller';
import { UnitsRepo } from './units.repo';
import { UnitsService } from './units.service';

@Module({
  imports: [PrismaModule, BuildingsModule, BuildingAccessModule],
  controllers: [UnitsController],
  providers: [UnitsRepo, UnitsService],
  exports: [UnitsRepo],
})
export class UnitsModule {}
