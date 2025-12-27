import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { PlatformAuthGuard } from '../../common/guards/platform-auth.guard';
import { PlatformOrgsController } from './platform-orgs.controller';
import { PlatformOrgAdminsController } from './platform-org-admins.controller';
import { PlatformOrgsService } from './platform-orgs.service';

@Module({
  imports: [PrismaModule, JwtModule.register({}), AccessControlModule],
  controllers: [PlatformOrgsController, PlatformOrgAdminsController],
  providers: [PlatformOrgsService, PlatformAuthGuard],
})
export class PlatformModule {}
