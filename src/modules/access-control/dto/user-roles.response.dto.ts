import { ApiProperty } from '@nestjs/swagger';

export class UserRolesResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: [String] })
  roleIds!: string[];
}
