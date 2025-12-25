import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepo } from './users.repo';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [PrismaModule, AccessControlModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepo, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
