import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/request-context';
import { assertOrgScope } from '../../common/utils/org-scope';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { OwnersRepo } from './owners.repo';

@Injectable()
export class OwnersService {
  constructor(private readonly ownersRepo: OwnersRepo) {}

  list(user: AuthenticatedUser | undefined, search?: string) {
    const orgId = assertOrgScope(user);
    return this.ownersRepo.list(orgId, search);
  }

  create(user: AuthenticatedUser | undefined, dto: CreateOwnerDto) {
    const orgId = assertOrgScope(user);
    return this.ownersRepo.create(orgId, dto);
  }
}
