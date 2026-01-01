import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { OwnersController } from './owners.controller';
import { OwnersRepo } from './owners.repo';
import { OwnersService } from './owners.service';

@Module({
  imports: [PrismaModule, AccessControlModule],
  controllers: [OwnersController],
  providers: [OwnersRepo, OwnersService],
})
export class OwnersModule {}
