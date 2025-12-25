import { Injectable, NotImplementedException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import {
  DeleteObjectInput,
  GetSignedUrlInput,
  PutObjectInput,
  StorageClient,
} from './storage.service';

@Injectable()
export class S3Adapter implements StorageClient {
  private readonly client: S3Client;
  private readonly bucket?: string;

  constructor() {
    this.client = new S3Client({
      region: env.STORAGE_REGION || 'auto',
      endpoint: env.STORAGE_ENDPOINT,
      credentials:
        env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.STORAGE_ACCESS_KEY_ID,
              secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
    this.bucket = env.STORAGE_BUCKET;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    this.ensureConfigured();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    });
    await this.client.send(command);
  }

  async getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    this.ensureConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    this.ensureConfigured();
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
    });
    await this.client.send(command);
  }

  private ensureConfigured() {
    if (
      !this.bucket ||
      !env.STORAGE_ENDPOINT ||
      !env.STORAGE_ACCESS_KEY_ID ||
      !env.STORAGE_SECRET_ACCESS_KEY
    ) {
      throw new NotImplementedException('Storage adapter not configured');
    }
  }
}
