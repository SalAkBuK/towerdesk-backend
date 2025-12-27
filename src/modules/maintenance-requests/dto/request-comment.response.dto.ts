import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestCommentAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  name?: string | null;

  @ApiProperty()
  email!: string;
}

export class RequestCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty({ type: RequestCommentAuthorDto })
  author!: RequestCommentAuthorDto;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdAt!: Date;
}

type CommentWithAuthor = {
  id: string;
  requestId: string;
  message: string;
  createdAt: Date;
  authorUser: { id: string; name?: string | null; email: string };
};

export const toRequestCommentResponse = (
  comment: CommentWithAuthor,
): RequestCommentResponseDto => ({
  id: comment.id,
  requestId: comment.requestId,
  author: {
    id: comment.authorUser.id,
    name: comment.authorUser.name ?? null,
    email: comment.authorUser.email,
  },
  message: comment.message,
  createdAt: comment.createdAt,
});
