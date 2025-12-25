import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role.response.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  @ApiOkResponse({ type: [RoleResponseDto] })
  list() {
    return this.rolesService.list();
  }

  @Post()
  @RequirePermissions('roles.write')
  @ApiOkResponse({ type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Post(':roleId/permissions')
  @RequirePermissions('roles.write')
  @ApiOkResponse({ type: RoleResponseDto })
  setPermissions(@Param('roleId') roleId: string, @Body() dto: SetRolePermissionsDto) {
    return this.rolesService.setRolePermissions(roleId, dto.permissionKeys, dto.mode);
  }
}
