import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepo } from './users.repo';
import { toUserResponse } from './dto/user.response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepo) {}

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponse(user);
  }
}
