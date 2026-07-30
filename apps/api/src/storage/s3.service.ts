import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { S3, S3_BUCKET } from './s3.tokens';

export interface S3Object {
  body: Readable;
  contentType?: string;
}

@Injectable()
export class S3Service {
  constructor(
    @Inject(S3) private readonly s3: S3Client,
    @Inject(S3_BUCKET) private readonly bucket: string,
  ) {}

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
  }

  async getObject(key: string): Promise<S3Object> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return { body: res.Body as Readable, contentType: res.ContentType };
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function isNoSuchKeyError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'NoSuchKey' ||
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
  );
}
