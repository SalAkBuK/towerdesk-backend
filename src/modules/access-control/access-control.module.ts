import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessControlRepo } from './access-control.repo';
import { AccessControlService } from './access-control.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserAccessController } from './user-access.controller';
import { UserAccessService } from './user-access.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController, RolesController, UserAccessController],
  providers: [
    AccessControlRepo,
    AccessControlService,
    PermissionsService,
    RolesService,
    UserAccessService,
    PermissionsGuard,
  ],
  exports: [AccessControlService, PermissionsGuard],
})
export class AccessControlModule {}
