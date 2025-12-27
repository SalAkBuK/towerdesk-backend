import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UnitsModule } from '../units/units.module';
import { BuildingAccessModule } from '../../common/building-access/building-access.module';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';
import { ResidentProfileController } from './resident-profile.controller';

@Module({
  imports: [PrismaModule, BuildingsModule, UnitsModule, BuildingAccessModule],
  controllers: [ResidentsController, ResidentProfileController],
  providers: [ResidentsService],
})
export class ResidentsModule {}
