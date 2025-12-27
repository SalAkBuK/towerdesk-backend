import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RequestAttachmentResponseDto,
  toRequestAttachmentResponse,
} from './request-attachment.response.dto';

export class BuildingRequestUserDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  name?: string | null;

  @ApiProperty()
  email!: string;
}

export class BuildingRequestUnitDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional({ nullable: true })
  floor?: number | null;
}

export class BuildingRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiPropertyOptional({ type: BuildingRequestUnitDto, nullable: true })
  unit?: BuildingRequestUnitDto | null;

  @ApiProperty({ type: BuildingRequestUserDto })
  createdBy!: BuildingRequestUserDto;

  @ApiPropertyOptional({ type: BuildingRequestUserDto, nullable: true })
  assignedTo?: BuildingRequestUserDto | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  priority?: string | null;

  @ApiPropertyOptional({ nullable: true })
  type?: string | null;

  @ApiPropertyOptional({ type: [RequestAttachmentResponseDto] })
  attachments?: RequestAttachmentResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

type RequestWithRelations = {
  id: string;
  buildingId: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  type?: string | null;
  createdAt: Date;
  updatedAt: Date;
  unit?: { id: string; label: string; floor?: number | null } | null;
  createdByUser: { id: string; name?: string | null; email: string };
  assignedToUser?: { id: string; name?: string | null; email: string } | null;
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    createdAt: Date;
  }[];
};

export const toBuildingRequestResponse = (
  request: RequestWithRelations,
): BuildingRequestResponseDto => ({
  id: request.id,
  buildingId: request.buildingId,
  unit: request.unit
    ? {
        id: request.unit.id,
        label: request.unit.label,
        floor: request.unit.floor ?? null,
      }
    : null,
  createdBy: {
    id: request.createdByUser.id,
    name: request.createdByUser.name ?? null,
    email: request.createdByUser.email,
  },
  assignedTo: request.assignedToUser
    ? {
        id: request.assignedToUser.id,
        name: request.assignedToUser.name ?? null,
        email: request.assignedToUser.email,
      }
    : null,
  title: request.title,
  description: request.description ?? null,
  status: request.status,
  priority: request.priority ?? null,
  type: request.type ?? null,
  attachments: request.attachments
    ? request.attachments.map((attachment) =>
        toRequestAttachmentResponse(attachment),
      )
    : undefined,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});
