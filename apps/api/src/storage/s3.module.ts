import { Global, Inject, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

export const S3 = Symbol('S3');
export const S3_BUCKET = Symbol('S3_BUCKET');

@Injectable()
class S3HealthService implements OnModuleInit {
  private readonly logger = new Logger(S3HealthService.name);

  constructor(
    @Inject(S3) private readonly s3: S3Client,
    @Inject(S3_BUCKET) private readonly bucket: string,
  ) {}

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`✅ S3-Verbindung erfolgreich (Bucket: ${this.bucket})`);
    } catch (err) {
      this.logger.error(`❌ S3-Verbindung fehlgeschlagen (Bucket: ${this.bucket})`, err);
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: S3_BUCKET,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.getOrThrow<string>('S3_BUCKET'),
    },
    {
      provide: S3,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
          region: config.get<string>('S3_REGION') ?? 'us-east-1',
          forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
          credentials: {
            accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
            secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
          },
        }),
    },
    S3HealthService,
  ],
  exports: [S3, S3_BUCKET],
})
export class S3Module {}
