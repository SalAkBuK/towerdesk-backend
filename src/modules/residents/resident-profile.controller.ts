import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { AuthenticatedUser } from '../../common/types/request-context';
import { ResidentsService } from './residents.service';
import {
  ResidentMeResponseDto,
  toResidentMeResponse,
} from './dto/resident-me.response.dto';

@ApiTags('resident-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgScopeGuard)
@Controller('resident')
export class ResidentProfileController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get('me')
  @ApiOkResponse({ type: ResidentMeResponseDto })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.residentsService.getCurrentResidentProfile(user);
    return toResidentMeResponse(profile.user, profile.occupancy);
  }
}
