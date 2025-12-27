import { ApiProperty } from '@nestjs/swagger';

export class OrgProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  logoUrl?: string | null;
}

export const toOrgProfileResponse = (org: {
  id: string;
  name: string;
  logoUrl?: string | null;
}): OrgProfileResponseDto => ({
  id: org.id,
  name: org.name,
  logoUrl: org.logoUrl ?? null,
});
