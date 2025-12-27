import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepo } from './users.repo';
import { OrgUsersProvisionController } from './org-users-provision.controller';
import { OrgUsersProvisionService } from './org-users-provision.service';
import { OrgUsersController } from './org-users.controller';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [PrismaModule, AccessControlModule],
  controllers: [UsersController, OrgUsersProvisionController, OrgUsersController],
  providers: [UsersService, OrgUsersProvisionService, UsersRepo, JwtAuthGuard],
  exports: [UsersService, UsersRepo],
})
export class UsersModule {}
