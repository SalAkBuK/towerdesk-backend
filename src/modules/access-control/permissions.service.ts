import { Injectable } from '@nestjs/common';
import { AccessControlRepo } from './access-control.repo';
import {
  PermissionResponseDto,
  toPermissionResponse,
} from './dto/permission.response.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly accessControlRepo: AccessControlRepo) {}

  async list(): Promise<PermissionResponseDto[]> {
    const permissions = await this.accessControlRepo.listPermissions();
    return permissions.map(toPermissionResponse);
  }
}
