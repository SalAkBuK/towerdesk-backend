import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { UserRolesResponseDto } from './dto/user-roles.response.dto';
import { UserPermissionsResponseDto } from './dto/user-permissions.response.dto';
import { UserAccessService } from './user-access.service';

@ApiTags('access-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  @Post(':userId/roles')
  @RequirePermissions('users.write')
  @ApiOkResponse({ type: UserRolesResponseDto })
  async assignRoles(
    @Param('userId') userId: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    await this.userAccessService.assignRoles(userId, dto.roleIds, dto.mode);
    return {
      userId,
      roleIds: dto.roleIds,
    };
  }

  @Post(':userId/permissions')
  @RequirePermissions('users.write')
  @ApiOkResponse({ type: UserPermissionsResponseDto })
  async setPermissions(
    @Param('userId') userId: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    await this.userAccessService.setPermissionOverrides(userId, dto.overrides);
    return {
      userId,
      overrides: dto.overrides,
    };
  }
}
