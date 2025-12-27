import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../common/types/request-context';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user.response.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { CreateOrgUserResponseDto } from './dto/create-org-user.response.dto';
import { UserBuildingAssignmentResponseDto } from './dto/user-building-assignment.response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('me/assignments')
  @UseGuards(OrgScopeGuard)
  @ApiOkResponse({ type: [UserBuildingAssignmentResponseDto] })
  listMyAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listMyAssignments(user);
  }

  @Patch('me/profile')
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  getById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(OrgScopeGuard)
  @RequirePermissions('users.write')
  @ApiOkResponse({ type: CreateOrgUserResponseDto })
  createOrgUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrgUserDto,
  ) {
    return this.usersService.createInOrg(user, dto);
  }
}
